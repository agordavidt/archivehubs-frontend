import { connectSocket } from '../core/socket.js';

let root, bar, panel, listEl, badgeEl, chevronEl, avatarsEl;
let socket;
let conversations = [];
let expanded = false;

export async function initMessagingWidget() {
  root = document.querySelector('[data-mwidget]');
  if (!root) return;   // widget not on this page — fine

  bar       = root.querySelector('[data-mwidget-bar]');
  panel     = root.querySelector('[data-mwidget-panel]');
  listEl    = root.querySelector('[data-mwidget-list]');
  badgeEl   = root.querySelector('[data-mwidget-badge]');
  chevronEl = root.querySelector('[data-mwidget-chevron]');
  avatarsEl = root.querySelector('[data-mwidget-avatars]');

  bar.addEventListener('click', (e) => {
    if (e.target.closest('[data-mwidget-goto]')) return;
    toggle();
  });
  root.querySelector('[data-mwidget-goto]').addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = '/pages/messages.html';
  });

  socket = await connectSocket();
  wireSocket();
  loadConversations();

  // Refresh list when new messages arrive
  socket.on('newMessage', () => loadConversations());
}

function toggle() {
  expanded = !expanded;
  panel.classList.toggle('hidden', !expanded);
  chevronEl.textContent = expanded ? 'expand_more' : 'expand_less';
  root.classList.toggle('mwidget-open', expanded);
  if (expanded) loadConversations();
}

function loadConversations() {
  socket.emit('getConversations', {}, (res) => {
    conversations = (res?.conversations || []).slice(0, 5);
    renderBar();
    if (expanded) renderList();
  });
}

function renderBar() {
  const unread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  if (unread > 0) {
    badgeEl.textContent = String(unread);
    badgeEl.classList.remove('hidden');
  } else {
    badgeEl.classList.add('hidden');
  }

  avatarsEl.innerHTML = conversations.slice(0, 3).map(c => {
    const p = c.participants[0] || {};
    return `<img src="${escAttr(p.avatar || '/images/profile.jpg')}" alt="">`;
  }).join('');
}

function renderList() {
  if (!conversations.length) {
    listEl.innerHTML = `<p class="mwidget-empty">No conversations yet.</p>`;
    return;
  }

  listEl.innerHTML = conversations.map(c => {
    const p = c.participants[0] || {};
    const unread = c.unreadCount || 0;
    const preview = c.lastMessage?.content || 'No messages yet';
    return `
      <a class="mwidget-conv ${unread ? 'unread' : ''}" href="/pages/messages.html?conv=${escAttr(c.id)}">
        <img src="${escAttr(p.avatar || '/images/profile.jpg')}" alt="">
        <div class="mwidget-conv-body">
          <div class="mwidget-conv-row1">
            <span class="mwidget-conv-name">${escHtml(p.name || 'Unknown')}</span>
            ${unread ? `<span class="mwidget-conv-badge">${unread}</span>` : ''}
          </div>
          <span class="mwidget-conv-preview">${escHtml(preview)}</span>
        </div>
      </a>
    `;
  }).join('');
}

function wireSocket() {
  socket.on('newMessage', () => {
    // Reload list lazily; also flash badge
    if (expanded) loadConversations();
  });
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const escAttr = escHtml;