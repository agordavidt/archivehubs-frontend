import { api }   from './api.js';
import { store } from './store.js';

// ─────────────────────────────────────────────────────────────
// ACCOUNT MODEL
//
// One person (login) owns one or more accounts. Each account is
// either 'individual' or 'corporate'. Exactly one is 'active' per
// session — that's what /user returns and what every component
// should render as "the current user".
//
// Backend endpoints this module depends on:
//   GET  /user              → active account
//   GET  /user/accounts     → { active, accounts[] }   (may 404 on old backend)
//   POST /user/switch       → { accountId, account_type }
// ─────────────────────────────────────────────────────────────

let currentUser    = null;      // active account (individual OR corporate)
let allAccounts    = [];        // switchable accounts
let activeAccountId = null;

export async function initSession() {
  window.addEventListener('auth:unauthorized', () => {
    currentUser = null;
    allAccounts = [];
    activeAccountId = null;
    store.emit('session:expired');
  });

  try {
    currentUser = await api.getCurrentUser();
    activeAccountId = currentUser?.id || null;
    store.emit('session:ready', currentUser);
    await loadAccounts();
    await flushPendingProfile(currentUser);
  } catch (e) {
    if (e.status === 401 || e.status === 0) {
      currentUser = null;
      store.emit('session:anonymous');
    } else throw e;
  }
  return currentUser;
}

async function loadAccounts() {
  try {
    const res = await api.getUserAccounts();
    allAccounts     = res.accounts || [];
    activeAccountId = res.active?.id || activeAccountId;
  } catch (e) {
    // Backend hasn't shipped /user/accounts yet — degrade gracefully.
    allAccounts = currentUser ? [{
      id:           currentUser.id,
      account_type: currentUser.account_type || 'individual',
      displayName:  getAccountDisplayName(currentUser),
      avatar:       getAccountAvatar(currentUser),
      headline:     currentUser.headline || '',
      role:         'owner',
    }] : [];
  }
}

export async function refreshSession() {
  try {
    currentUser = await api.getCurrentUser();
    activeAccountId = currentUser?.id || null;
    store.emit('session:ready', currentUser);
    return currentUser;
  } catch {
    currentUser = null;
    store.emit('session:anonymous');
    return null;
  }
}

export async function logout() {
  try { await api.logout(); } catch (_) {}
  currentUser = null;
  allAccounts = [];
  activeAccountId = null;
  store.emit('session:anonymous');
}

/**
 * Switch the active account. Refreshes the session and emits
 * 'account:switched' so navbar / feed / profile can re-render.
 */
export async function switchAccount(accountId, account_type) {
  await api.switchAccount(accountId, account_type);
  await refreshSession();
  await loadAccounts();
  store.emit('account:switched', { accountId, account_type, account: currentUser });
  return currentUser;
}

export const getUser           = () => currentUser;
export const getAccounts       = () => allAccounts;
export const getActiveAccountId = () => activeAccountId;
export const isAuthed          = () => !!currentUser;

export async function requireAuth() {
  if (!currentUser) await initSession();
  if (!currentUser) {
    window.location.replace('/pages/login.html');
    return false;
  }
  return true;
}

export async function redirectIfAuth() {
  if (!currentUser) await initSession();
  if (currentUser) {
    window.location.replace('/pages/home.html');
    return true;
  }
  return false;
}

// ── Display helpers ─────────────────────────────────────────
export function getAccountDisplayName(account) {
  if (!account) return '';
  if (account.account_type === 'corporate') {
    return account.name || account.displayName || 'Company';
  }
  const parts = [account.firstName, account.lastName].filter(Boolean);
  return parts.join(' ') || account.displayName || account.email || 'User';
}

export function getAccountAvatar(account) {
  if (!account) return '/images/profile.jpg';
  if (account.account_type === 'corporate') {
    return account.logo || account.avatar || '/images/Logo.jpg';
  }
  return account.profilePic || account.avatar || '/images/profile.jpg';
}

export function getAccountTypeLabel(account) {
  return account?.account_type === 'corporate' ? 'Corporate Page' : 'Personal';
}

// ── Pending profile handoff ─────────────────────────────────
async function flushPendingProfile(user) {
  const key = `ah:pending-profile:${user.id}`;
  let pending;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    pending = JSON.parse(raw);
  } catch { return; }

  try {
    if (pending.account_type === 'corporate') {
      await api.createCorporateAccount({ userId: user.id, ...pending.profile });
    } else {
      await api.createIndividualAccount({ userId: user.id, ...pending.profile });
    }
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('[session] pending profile submit failed:', e);
  }
}

export function setPendingProfile(userId, account_type, profile) {
  try {
    localStorage.setItem(
      `ah:pending-profile:${userId}`,
      JSON.stringify({ account_type, profile })
    );
  } catch (_) {}
}