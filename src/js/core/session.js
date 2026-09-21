import { api }   from './api.js';
import { store } from './store.js';

let currentUser = null;

export async function initSession() {
  window.addEventListener('auth:unauthorized', () => {
    currentUser = null;
    store.emit('session:expired');
  });

  try {
    currentUser = await api.getCurrentUser();
    store.emit('session:ready', currentUser);
    await flushPendingProfile(currentUser);
  } catch (e) {
    if (e.status === 401 || e.status === 0) {
      currentUser = null;
      store.emit('session:anonymous');
    } else throw e;
  }
  return currentUser;
}

export async function refreshSession() {
  try {
    currentUser = await api.getCurrentUser();
    store.emit('session:ready', currentUser);
    return currentUser;
  } catch (e) {
    currentUser = null;
    store.emit('session:anonymous');
    return null;
  }
}

export async function logout() {
  try { await api.logout(); } catch (_) {}
  currentUser = null;
  store.emit('session:anonymous');
}

export const getUser  = () => currentUser;
export const isAuthed = () => !!currentUser;

/** Redirect to /pages/login.html if not authenticated. */
export async function requireAuth() {
  if (!currentUser) await initSession();
  if (!currentUser) {
    window.location.replace('/pages/login.html');
    return false;
  }
  return true;
}

/** Redirect to home if already authenticated (use on login/signup pages). */
export async function redirectIfAuth() {
  if (!currentUser) await initSession();
  if (currentUser) {
    window.location.replace('/pages/home.html');
    return true;
  }
  return false;
}

// ── Pending profile handoff ─────────────────────────────────
// After signup we stash the profile info the user entered, then
// submit it to /account/create-* on their first successful login.

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
    // Leave the key so it retries on next login
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