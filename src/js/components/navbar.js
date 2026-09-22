import { store } from '../core/store.js';
import {
  getUser,
  getAccounts,
  getActiveAccountId,
  switchAccount,
  logout,
  getAccountDisplayName,
  getAccountAvatar,
  getAccountTypeLabel,
} from '../core/session.js';

let popup, trigger;

export function initNavbar() {
  popup   = document.getElementById('accountPopupPanel');
  trigger = document.getElementById('accountPopup');
  if (!popup || !trigger) {
    console.warn('[navbar] account popup not found');
    return;
  }

  wirePopup();
  highlightActiveNav();
  renderPopup();

  store.on('session:ready',     renderPopup);
  store.on('account:switched',  renderPopup);
  store.on('session:anonymous', closePopup);
}

// ── Popup show/hide ────────────────────────────────────────
function wirePopup() {
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const open = popup.classList.toggle('active');
    trigger.setAttribute('aria-expanded', String(open));
  });

  // Outside-click close
  document.addEventListener('click', (e) => {
    if (!popup.classList.contains('active')) return;
    if (popup.contains(e.target) || trigger.contains(e.target)) return;
    closePopup();
  });

  // Escape closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup.classList.contains('active')) closePopup();
  });

  // Sign out
  popup.querySelector('[data-signout]')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await logout();
    window.location.replace('/pages/login.html');
  });

  // See all profiles (placeholder)
  popup.querySelector('[data-view-all]')?.addEventListener('click', () => {
    window.location.href = '/pages/profiles.html';
  });
}

function closePopup() {
  popup?.classList.remove('active');
  trigger?.setAttribute('aria-expanded', 'false');
}

// ── Render ─────────────────────────────────────────────────
function renderPopup() {
  const active   = getUser();
  const accounts = getAccounts();
  const activeId = getActiveAccountId();

  // Active account block
  const nameEl   = popup.querySelector('[data-active-name]');
  const avatarEl = popup.querySelector('[data-active-avatar]');
  const typeEl   = popup.querySelector('[data-active-type]');
  const linkEl   = popup.querySelector('[data-active-link]');

  if (active) {
    nameEl.textContent   = getAccountDisplayName(active);
    avatarEl.src         = getAccountAvatar(active);
    typeEl.textContent   = getAccountTypeLabel(active);
    linkEl.href          = profileUrlFor(active);
  } else {
    nameEl.textContent   = 'Not signed in';
    typeEl.textContent   = '';
  }

  // Nav trigger avatar
  const navAvatar = document.querySelector('[data-nav-avatar]');
  if (navAvatar && active) navAvatar.src = getAccountAvatar(active);

  // Switcher list — every account EXCEPT the active one
  const switcherList = popup.querySelector('[data-switcher-list]');
  switcherList.innerHTML = '';

  const others = accounts.filter(a => a.id !== activeId);
  others.forEach(acct => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'account-switcher-item';
    item.innerHTML = `
      <div class="account-switcher-avatar-container">
        <img src="${escapeAttr(acct.avatar)}" alt="" class="account-switcher-avatar">
        <div class="switch-roller"></div>
      </div>
      <div class="account-switcher-info">
        <span class="account-switcher-name">${escapeHtml(acct.displayName)}</span>
        <span class="account-switcher-meta">${escapeHtml(acct.headline || '')}</span>
      </div>
    `;
    item.addEventListener('click', async () => {
      item.disabled = true;
      try {
        await switchAccount(acct.id, acct.account_type);
        closePopup();
      } catch (e) {
        console.error('[navbar] switch failed:', e);
        item.disabled = false;
      }
    });
    switcherList.appendChild(item);
  });

  // Hide "See all profiles" when there's only one account
  const viewAllRow = popup.querySelector('.account-popup-view-profile-row');
  viewAllRow.classList.toggle('hidden', accounts.length <= 1);
}

// ── Active nav highlight ───────────────────────────────────
function highlightActiveNav() {
  const here = window.location.pathname.replace(/\/$/, '');
  document.querySelectorAll('.nav-link[data-nav], .mobile-nav-link[data-nav]')
    .forEach(link => {
      const href = link.getAttribute('href') || '';
      let target;
      try { target = new URL(href, window.location.origin).pathname.replace(/\/$/, ''); }
      catch { return; }
      link.classList.toggle('active', target === here);
    });
}

// ── Helpers ────────────────────────────────────────────────
function profileUrlFor(account) {
  if (!account) return '/pages/home.html';
  return account.account_type === 'corporate'
    ? `/pages/corporate/${account.id}.html`
    : `/pages/profile/${account.id}.html`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const escapeAttr = escapeHtml;