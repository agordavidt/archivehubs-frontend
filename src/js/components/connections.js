import { api }   from '../core/api.js';
import { store } from '../core/store.js';

const KIND_LABELS = {
  aty: 'For you',
  acr: 'Activity-based',
  rcr: 'Role-based',
  pcr: 'Popular',
  bcr: 'Business',
};

const BDAY_LABELS = {
  tbr: "Today's birthdays",
  rbr: 'Recent birthdays',
  ubr: 'Upcoming birthdays',
};

// ── State ────────────────────────────────────────────────────
let root;
let connections = [];
let requests    = [];
let suggestions = [];
let birthdays   = [];
let currentTab       = 'list';
let currentSubtab    = 'aty';
let currentBdayTab   = 'tbr';
let connectionsQuery = '';

// ── Init ─────────────────────────────────────────────────────
export function initConnections() {
  root = document.querySelector('[data-connections-page]');
  if (!root) { console.warn('[connections] root not found'); return; }

  wireTabs();
  wireSubtabs();
  wireBirthdayTabs();
  wireSearch();

  // Cross-component updates
  store.on('connection:accepted', refreshAll);
  store.on('connection:rejected', refreshAll);
  store.on('connection:requested', refreshAll);

  loadTab('list');           // triggers first fetch
  loadBirthdays('tbr');      // parallel
}

// ── Tabs ─────────────────────────────────────────────────────
function wireTabs() {
  root.querySelectorAll('.cp-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === currentTab) return;
      currentTab = tab;
      root.querySelectorAll('.cp-tab').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      root.querySelectorAll('.cp-panel').forEach(p =>
        p.classList.toggle('active', p.dataset.panel === tab));
      loadTab(tab);
    });
  });
}

function wireSubtabs() {
  root.querySelectorAll('.cp-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.subtab;
      if (kind === currentSubtab) return;
      currentSubtab = kind;
      root.querySelectorAll('.cp-subtab').forEach(b =>
        b.classList.toggle('active', b === btn));
      loadSuggestions(kind);
    });
  });
}

function wireBirthdayTabs() {
  root.querySelectorAll('.cp-bday-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.bday;
      if (kind === currentBdayTab) return;
      currentBdayTab = kind;
      root.querySelectorAll('.cp-bday-tab').forEach(b =>
        b.classList.toggle('active', b === btn));
      loadBirthdays(kind);
    });
  });
}

function wireSearch() {
  const input = root.querySelector('[data-search-connections]');
  input?.addEventListener('input', (e) => {
    connectionsQuery = e.target.value.trim().toLowerCase();
    renderConnections();
  });
}

// ── Loaders ──────────────────────────────────────────────────
async function loadTab(tab) {
  if (tab === 'list')        return loadConnections();
  if (tab === 'requests')    return loadRequests();
  if (tab === 'suggestions') return loadSuggestions(currentSubtab);
}

async function loadConnections() {
  const grid = root.querySelector('[data-connections-grid]');
  grid.innerHTML = loadingHTML();
  try {
    const res = await api.getConnections(0);
    connections = res.connections || [];
    updateTabCounts();
    renderConnections();
  } catch (e) {
    grid.innerHTML = errorHTML('Failed to load connections.');
    console.error('[connections] list load failed:', e);
  }
}

async function loadRequests() {
  const grid = root.querySelector('[data-requests-grid]');
  grid.innerHTML = loadingHTML();
  try {
    const res = await api.getConnectionRequests();
    requests = res.requests || [];
    updateTabCounts();
    renderRequests();
  } catch (e) {
    grid.innerHTML = errorHTML('Failed to load requests.');
    console.error('[connections] requests load failed:', e);
  }
}

async function loadSuggestions(kind) {
  const grid = root.querySelector('[data-suggestions-grid]');
  grid.innerHTML = loadingHTML();
  try {
    const res = await api.getConnectionRecommendations(kind, 0);
    suggestions = res.connections || [];
    renderSuggestions();
  } catch (e) {
    grid.innerHTML = errorHTML(`Failed to load ${KIND_LABELS[kind] || 'suggestions'}.`);
    console.error('[connections] suggestions load failed:', e);
  }
}

async function loadBirthdays(kind) {
  const list = root.querySelector('[data-birthdays-list]');
  list.innerHTML = loadingHTML();
  try {
    const res = await api.getBirthdays(kind, 0);
    birthdays = res.connections || [];
    renderBirthdays();
  } catch (e) {
    list.innerHTML = `<p class="cp-empty-sm">No birthdays.</p>`;
    console.error('[connections] birthdays load failed:', e);
  }
}

async function refreshAll() {
  await Promise.all([
    loadConnections(),
    loadRequests(),
  ]);
  if (currentTab === 'suggestions') await loadSuggestions(currentSubtab);
}

// ── Render: Connections ──────────────────────────────────────
function renderConnections() {
  const grid = root.querySelector('[data-connections-grid]');
  const list = connectionsQuery
    ? connections.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(connectionsQuery) ||
        (c.headline || '').toLowerCase().includes(connectionsQuery))
    : connections;

  if (!list.length) {
    grid.innerHTML = emptyHTML(
      connectionsQuery ? 'No connections match your search.' : 'You have no connections yet.',
      'Explore suggestions',
      () => root.querySelector('.cp-tab[data-tab="suggestions"]')?.click()
    );
    return;
  }

  grid.innerHTML = list.map(c => connectionCardHTML(c, 'list')).join('');
  wireCardActions(grid);
}

// ── Render: Requests ─────────────────────────────────────────
function renderRequests() {
  const grid = root.querySelector('[data-requests-grid]');
  if (!requests.length) {
    grid.innerHTML = emptyHTML('No pending requests.', null, null);
    return;
  }
  grid.innerHTML = requests.map(r => connectionCardHTML(r, 'request')).join('');
  wireCardActions(grid);
}

// ── Render: Suggestions ──────────────────────────────────────
function renderSuggestions() {
  const grid = root.querySelector('[data-suggestions-grid]');
  if (!suggestions.length) {
    grid.innerHTML = emptyHTML('No suggestions right now. Check back later.', null, null);
    return;
  }
  grid.innerHTML = suggestions.map(s => connectionCardHTML(s, 'suggestion')).join('');
  wireCardActions(grid);
}

// ── Render: Birthdays ────────────────────────────────────────
function renderBirthdays() {
  const list = root.querySelector('[data-birthdays-list]');
  if (!birthdays.length) {
    list.innerHTML = `<p class="cp-empty-sm">No ${BDAY_LABELS[currentBdayTab].toLowerCase()}.</p>`;
    return;
  }
  list.innerHTML = birthdays.map(b => `
    <div class="cp-bday-item">
      <img src="${escAttr(b.profilePic || '/images/profile.jpg')}" alt="">
      <div class="cp-bday-info">
        <span class="cp-bday-name">${escHtml(`${b.firstName} ${b.lastName}`.trim())}</span>
        <span class="cp-bday-headline">${escHtml(b.headline || '')}</span>
      </div>
      <button class="cp-bday-wish" type="button" data-wish="${escAttr(b.id)}">Wish</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-wish]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.closest('.cp-bday-item').querySelector('.cp-bday-name').textContent;
      btn.textContent = 'Sent ✓';
      btn.disabled = true;
      store.emit('notification', { type: 'birthday', message: `Wished ${name} happy birthday` });
    });
  });
}

// ── Shared: Card HTML ────────────────────────────────────────
function connectionCardHTML(user, context) {
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const avatar = user.profilePic || '/images/profile.jpg';
  const headline = user.headline || '';
  const status = user.connectionStatus || 'none';

  let actions = '';
  let meta = '';

  if (context === 'request') {
    meta = user.mutualCount ? `${user.mutualCount} mutual` : '';
    actions = `
      <button class="connect-btn" data-action="accept" data-user-id="${escAttr(user.id)}">Accept</button>
      <button class="decline-btn" data-action="reject" data-user-id="${escAttr(user.id)}">Decline</button>
    `;
  } else if (context === 'suggestion') {
    meta = user.reason || (user.mutualCount ? `${user.mutualCount} mutual connections` : '');
    if (status === 'pending') {
      actions = `<button class="connect-btn" disabled>Request sent</button>`;
    } else if (status === 'connected') {
      actions = `<button class="connect-btn" disabled>Connected</button>`;
    } else if (status === 'incoming') {
      actions = `
        <button class="connect-btn" data-action="accept" data-user-id="${escAttr(user.id)}">Accept</button>
        <button class="decline-btn" data-action="reject" data-user-id="${escAttr(user.id)}">Ignore</button>
      `;
    } else {
      actions = `<button class="connect-btn" data-action="connect" data-user-id="${escAttr(user.id)}">Connect</button>`;
    }
  } else {
    // list view — connected users
    meta = user.connectedAt
      ? `Connected ${timeAgo(user.connectedAt)}`
      : '';
    actions = `<button class="connect-btn" data-action="message" data-user-id="${escAttr(user.id)}">Message</button>`;
  }

  const metaLine = meta
    ? `<p class="connection-meta">${escHtml(meta)}</p>`
    : '';

  return `
    <div class="connection-card" data-user-id="${escAttr(user.id)}">
      <img src="${escAttr(avatar)}" alt="" class="connection-avatar">
      <div class="connection-info">
        <h4>${escHtml(name)}</h4>
        <p>${escHtml(headline)}</p>
        ${metaLine}
      </div>
      <div class="connection-actions">${actions}</div>
    </div>
  `;
}

// ── Card action wiring ───────────────────────────────────────
function wireCardActions(scope) {
  scope.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleCardAction(btn));
  });
}

async function handleCardAction(btn) {
  const action = btn.dataset.action;
  const userId = btn.dataset.userId;
  if (!action || !userId) return;

  if (action === 'connect') {
    const card = btn.closest('.connection-card');
    setButtonState(btn, 'Sending…', true);
    try {
      await api.sendConnectionRequest(userId);
      // Remove from suggestions locally
      suggestions = suggestions.filter(s => s.id !== userId);
      renderSuggestions();
      store.emit('connection:requested', { userId });
    } catch (e) {
      setButtonState(btn, 'Connect', false);
      alert(e.message || 'Could not send request.');
    }
    return;
  }

  if (action === 'accept') {
    setButtonState(btn, 'Accepting…', true);
    try {
      await api.acceptConnectionRequest(userId);
      store.emit('connection:accepted', { userId });
    } catch (e) {
      setButtonState(btn, 'Accept', false);
      alert(e.message || 'Could not accept.');
    }
    return;
  }

  if (action === 'reject') {
    setButtonState(btn, '…', true);
    try {
      await api.rejectConnectionRequest(userId);
      store.emit('connection:rejected', { userId });
    } catch (e) {
      setButtonState(btn, 'Decline', false);
      alert(e.message || 'Could not reject.');
    }
    return;
  }

  if (action === 'message') {
    // Placeholder — will hook into messaging once that lands
    store.emit('message:openWith', { userId });
    return;
  }
}

function setButtonState(btn, text, disabled) {
  btn.textContent = text;
  btn.disabled = disabled;
}

// ── Counts / badges ──────────────────────────────────────────
function updateTabCounts() {
  const cEl = root.querySelector('[data-count-connections]');
  const rEl = root.querySelector('[data-count-requests]');

  if (cEl) cEl.textContent = connections.length ? `(${connections.length})` : '';

  if (rEl) {
    if (requests.length) {
      rEl.textContent = String(requests.length);
      rEl.classList.remove('hidden');
    } else {
      rEl.classList.add('hidden');
    }
  }
}

// ── Small helpers ────────────────────────────────────────────
function loadingHTML() {
  return `<div class="cp-loading"><div class="spinner"></div></div>`;
}

function errorHTML(msg) {
  return `<p class="cp-error">${escHtml(msg)}</p>`;
}

function emptyHTML(msg, ctaLabel, ctaFn) {
  const cta = ctaLabel
    ? `<button class="cp-empty-cta" type="button">${escHtml(ctaLabel)}</button>`
    : '';
  const html = `<div class="cp-empty"><p>${escHtml(msg)}</p>${cta}</div>`;
  // wire CTA later via microtask
  if (ctaLabel && ctaFn) {
    queueMicrotask(() => {
      root.querySelector('.cp-empty-cta')?.addEventListener('click', ctaFn);
    });
  }
  return html;
}

function timeAgo(ms) {
  const d = Date.now() - ms;
  const s = Math.floor(d / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const escAttr = escHtml;