import { api }   from '../core/api.js';
import { store } from '../core/store.js';

const SIDEBAR_LIMIT = 3;

let root, listEl;
let suggestions = [];

export async function initHomeSidebar() {
  root = document.querySelector('[data-network-widget]');
  if (!root) { console.warn('[home-sidebar] network widget not found'); return; }

  listEl = root.querySelector('[data-network-list]');
  listEl.innerHTML = loadingHTML();

  // Refresh when session arrives (avatar/name available)
  store.on('session:ready', loadSuggestions);

  // Any connection action from anywhere in the app removes the card here
  store.on('connection:requested', ({ userId }) => removeById(userId));
  store.on('connection:accepted',  ({ userId }) => removeById(userId));
  store.on('connection:rejected',  ({ userId }) => removeById(userId));

  await loadSuggestions();
}

async function loadSuggestions() {
  try {
    const res = await api.getConnectionRecommendations('aty', 0);
    // Only show users we haven't already interacted with
    suggestions = (res.connections || [])
      .filter(u => (u.connectionStatus || 'none') === 'none')
      .slice(0, SIDEBAR_LIMIT);
    render();
  } catch (e) {
    console.error('[home-sidebar] suggestions load failed:', e);
    listEl.innerHTML = `<p class="sidebar-empty">Couldn't load suggestions.</p>`;
  }
}

function render() {
  if (!suggestions.length) {
    listEl.innerHTML = `
      <div class="sidebar-empty-state">
        <p>No new suggestions right now.</p>
        <a href="/pages/connections.html?tab=suggestions" class="sidebar-empty-cta">Find connections</a>
      </div>
    `;
    return;
  }

  listEl.innerHTML = suggestions.map(cardHTML).join('');
  listEl.querySelectorAll('[data-action]').forEach(btn =>
    btn.addEventListener('click', () => handle(btn)));
}

function cardHTML(user) {
  const name     = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const avatar   = user.profilePic || '/images/profile.jpg';
  const headline = user.headline || '';
  const meta     = user.reason || (user.mutualCount ? `${user.mutualCount} mutual connections` : '');

  return `
    <div class="suggestion-item" data-user-id="${escAttr(user.id)}">
      <div class="suggestion-header">
        <img src="${escAttr(avatar)}" alt="" class="suggestion-avatar">
        <div class="suggestion-info">
          <h4>${escHtml(name)}</h4>
          <p>${escHtml(headline)}</p>
          ${meta ? `<span class="suggestion-meta">${escHtml(meta)}</span>` : ''}
        </div>
      </div>
      <div class="suggestion-actions">
        <button class="connect-btn" data-action="connect" data-user-id="${escAttr(user.id)}">Connect</button>
        <button class="decline-btn" data-action="decline" data-user-id="${escAttr(user.id)}">Decline</button>
      </div>
    </div>
  `;
}

async function handle(btn) {
  const action = btn.dataset.action;
  const userId = btn.dataset.userId;
  const card   = btn.closest('.suggestion-item');
  if (!card) return;

  if (action === 'connect') {
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';
    try {
      await api.sendConnectionRequest(userId);
      removeById(userId);
      store.emit('connection:requested', { userId });
    } catch (e) {
      card.style.opacity = '';
      card.style.pointerEvents = '';
      console.error('[home-sidebar] connect failed:', e);
      alert(e.message || 'Could not send request.');
    }
    return;
  }

  if (action === 'decline') {
    // Optimistic — remove immediately, restore on failure
    const snapshot = [...suggestions];
    removeById(userId);
    try {
      await api.rejectConnectionRequest(userId);
      store.emit('connection:rejected', { userId });
    } catch (e) {
      console.warn('[home-sidebar] decline failed:', e);
      suggestions = snapshot;
      render();
    }
    return;
  }
}

function removeById(userId) {
  const before = suggestions.length;
  suggestions = suggestions.filter(s => s.id !== userId);
  if (suggestions.length === before) return;

  const card = listEl.querySelector(`[data-user-id="${userId}"]`);
  if (!card) { render(); return; }

  card.style.transition = 'opacity 0.2s, transform 0.2s';
  card.style.opacity = '0';
  card.style.transform = 'translateX(20px)';
  setTimeout(() => {
    card.remove();
    if (!suggestions.length) render();
  }, 200);
}

function loadingHTML() {
  return `<div class="sidebar-loading"><div class="spinner"></div></div>`;
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const escAttr = escHtml;