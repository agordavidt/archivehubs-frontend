import { connectSocket, getSocket } from '../core/socket.js';
import { api }                       from '../core/api.js';
import { store }                     from '../core/store.js';
import { getUser, getAccountDisplayName, getAccountAvatar } from '../core/session.js';

// ── State ────────────────────────────────────────────────────
const state = {
  conversations: [],           // all
  messages: new Map(),         // convId -> Message[]
  activeId: null,
  filter: 'focused',           // 'focused' | 'other'
  query: '',
  typingUsers: new Map(),      // convId -> userId[]
  composeRecipient: null,
  composeResults: [],
};

let root, sidebar, thread, listEl, messagesEl, typingEl, composer, inputEl;
let socket;
let handlers = [];

// ── Init ─────────────────────────────────────────────────────
export async function initMessaging() {
  root = document.querySelector('[data-msg-shell]');
  if (!root) {
    console.warn('[messaging] shell not found — did the partial mount?');
    return;
  }

  listEl     = root.querySelector('[data-conv-list]');
  thread     = root.querySelector('[data-msg-thread]');
  messagesEl = root.querySelector('[data-msg-messages]');
  typingEl   = root.querySelector('[data-msg-typing]');
  composer   = root.querySelector('[data-msg-composer]');
  inputEl    = root.querySelector('[data-msg-input]');

  hydrateSidebar();
  wireSidebar();
  wireThread();
  wireComposer();
  wireComposeModal();
  wireStore();

  socket = await connectSocket();
  wireSocket();

  await loadConversations();
}

// ── Sidebar ──────────────────────────────────────────────────
function hydrateSidebar() {
  const me = getUser();
  if (!me) return;
  // Avatar/name references if any — currently the partial doesn't show user info
}

function wireSidebar() {
  // Inbox tabs
  root.querySelectorAll('.msg-inbox-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.inbox;
      if (tab === state.filter) return;
      state.filter = tab;
      root.querySelectorAll('.msg-inbox-tab').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      renderConversations();
    });
  });

  // Search
  const search = root.querySelector('[data-msg-search]');
  search?.addEventListener('input', (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderConversations();
  });

  // Compose button (opens modal)
  root.querySelectorAll('[data-msg-compose]').forEach(btn =>
    btn.addEventListener('click', () => openComposeModal()));
}

// ── Thread ───────────────────────────────────────────────────
function wireThread() {
  root.querySelector('[data-thread-more]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    root.querySelector('[data-thread-menu]')?.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-thread-more]') && !e.target.closest('[data-thread-menu]')) {
      root.querySelector('[data-thread-menu]')?.classList.add('hidden');
    }
  });
  root.querySelectorAll('[data-thread-action]').forEach(btn =>
    btn.addEventListener('click', () => {
      const action = btn.dataset.threadAction;
      handleThreadAction(action);
    }));

  root.querySelector('[data-thread-star]')?.addEventListener('click', () => {
    const conv = state.conversations.find(c => c.id === state.activeId);
    if (!conv) return;
    conv.starred = !conv.starred;
    updateStarIcon(conv.starred);
  });
}

function updateStarIcon(starred) {
  const el = root.querySelector('[data-thread-star] .material-symbols-outlined');
  if (!el) return;
  el.textContent = starred ? 'star' : 'star_border';
  el.style.color  = starred ? 'var(--accent-color)' : '';
}

function handleThreadAction(action) {
  const conv = state.conversations.find(c => c.id === state.activeId);
  if (!conv) return;
  root.querySelector('[data-thread-menu]')?.classList.add('hidden');

  if (action === 'archive') {
    conv.focused = false;
    closeThread();
    renderConversations();
    return;
  }
  if (action === 'delete') {
    if (!confirm(`Delete conversation with ${conv.participants[0]?.name}?`)) return;
    state.conversations = state.conversations.filter(c => c.id !== conv.id);
    state.messages.delete(conv.id);
    closeThread();
    renderConversations();
    return;
  }
  if (action === 'block' || action === 'report') {
    alert(`${action === 'block' ? 'Block' : 'Report'} would notify moderators. Not implemented in mock.`);
  }
}

// ── Composer ─────────────────────────────────────────────────
function wireComposer() {
  inputEl?.addEventListener('input', updateSendButton);
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  composer?.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
  });

  // Attachments (image only in this slice)
  const fileInput = root.querySelector('[data-msg-file-input]');
  root.querySelector('[data-msg-attach="image"]')?.addEventListener('click', () => {
    fileInput.accept = 'image/*';
    fileInput.click();
  });
  root.querySelector('[data-msg-attach="file"]')?.addEventListener('click', () => {
    fileInput.accept = '';
    fileInput.click();
  });
  root.querySelector('[data-msg-attach="gif"]')?.addEventListener('click', () => {
    alert('GIF picker — coming soon');
  });
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) sendMessage({ file });
    fileInput.value = '';
  });
}

function updateSendButton() {
  const hasText = (inputEl?.textContent || '').trim().length > 0;
  const btn = root.querySelector('[data-msg-send]');
  if (btn) btn.disabled = !hasText;
}

async function sendMessage({ file } = {}) {
  const conv = state.conversations.find(c => c.id === state.activeId);
  if (!conv) return;

  const content = (inputEl?.textContent || '').trim();
  if (!content && !file) return;

  const recipientId = conv.participants[0]?.id;
  const mediaUrl = file ? URL.createObjectURL(file) : null;

  // Optimistic local append
  const optimistic = {
    id: `temp-${Date.now()}`,
    conversationId: conv.id,
    senderId: getUser()?.id || 'me',
    content,
    mediaUrl,
    createdAt: Date.now(),
    read: false,
    _pending: true,
  };
  appendMessage(optimistic);

  inputEl.textContent = '';
  updateSendButton();

  socket.emit('sendMessage', {
    recipientId,
    conversationId: conv.id,
    content,
    mediaUrl,
  }, (res) => {
    if (res?.message) {
      // Replace optimistic
      const list = state.messages.get(conv.id) || [];
      const idx = list.findIndex(m => m.id === optimistic.id);
      if (idx >= 0) list[idx] = res.message;
    }
  });
}

// ── Compose modal ────────────────────────────────────────────
// NOTE: the compose modal markup in messaging.html lives OUTSIDE
// `.msg-shell` (it's a sibling, not a child), so it is not inside
// `root`. Every lookup below queries `document` instead of `root`
// for that reason — this is the fix for the boot crash, and it
// does not require any HTML/CSS changes.
function wireComposeModal() {
  const modal = document.querySelector('[data-msg-compose-modal]');
  if (!modal) { console.warn('[messaging] compose modal not found'); return; }

  modal.querySelectorAll('[data-compose-close]').forEach(el =>
    el.addEventListener('click', closeComposeModal));

  const search = modal.querySelector('[data-compose-search]');
  search?.addEventListener('input', debounce(async (e) => {
    const q = e.target.value.trim();
    if (!q) { state.composeResults = []; renderComposeSuggestions(); return; }
    try {
      const res = await api.search(q);
      state.composeResults = res.users || [];
      renderComposeSuggestions();
    } catch { state.composeResults = []; renderComposeSuggestions(); }
  }, 200));

  const composeInput = modal.querySelector('[data-compose-input]');
  composeInput?.addEventListener('input', () => {
    const btn = modal.querySelector('[data-compose-send]');
    btn.disabled = !composeInput.textContent.trim() || !state.composeRecipient;
  });

  modal.querySelector('[data-compose-send]')?.addEventListener('click', () => {
    const recipient = state.composeRecipient;
    const content = composeInput.textContent.trim();
    if (!recipient || !content) return;

    // Find or create conversation, then send
    let conv = state.conversations.find(c => c.participants.some(p => p.id === recipient.id));
    if (!conv) {
      conv = {
        id: `c-${Date.now().toString(36)}`,
        participants: [recipient],
        lastMessage: null,
        unreadCount: 0,
        updatedAt: Date.now(),
        focused: true,
        starred: false,
      };
      state.conversations.unshift(conv);
      state.messages.set(conv.id, []);
    }
    state.activeId = conv.id;
    renderConversations();
    openThread(conv);
    closeComposeModal();

    // Now send via socket
    setTimeout(() => {
      inputEl.textContent = content;
      sendMessage();
    }, 60);
  });
}

function openComposeModal() {
  const modal = document.querySelector('[data-msg-compose-modal]');
  if (!modal) { console.warn('[messaging] compose modal not found'); return; }

  modal.classList.remove('hidden');
  state.composeRecipient = null;
  state.composeResults = [];
  modal.querySelector('[data-compose-search]').value = '';
  modal.querySelector('[data-compose-input]').textContent = '';
  modal.querySelector('[data-compose-send]').disabled = true;
  modal.querySelector('[data-compose-chosen]').innerHTML = '';
  modal.querySelector('[data-compose-chosen]').classList.add('hidden');
  modal.querySelector('[data-compose-body]').classList.add('hidden');
  renderComposeSuggestions();
  setTimeout(() => modal.querySelector('[data-compose-search]').focus(), 40);
}

function closeComposeModal() {
  document.querySelector('[data-msg-compose-modal]')?.classList.add('hidden');
}

function renderComposeSuggestions() {
  const modal = document.querySelector('[data-msg-compose-modal]');
  if (!modal) return;
  const wrap = modal.querySelector('[data-compose-suggestions]');

  if (!state.composeResults.length) {
    wrap.innerHTML = `<p class="msg-empty-list">${state.composeRecipient ? '' : 'Search for people to message'}</p>`;
    return;
  }

  wrap.innerHTML = state.composeResults.map(u => `
    <div class="msg-compose-suggestion" data-compose-id="${escAttr(u.id)}">
      <img src="${escAttr(u.profilePic || '/images/profile.jpg')}" alt="">
      <div class="msg-compose-suggestion-info">
        <span class="msg-compose-suggestion-name">${escHtml(u.name || u.email)}</span>
        <span class="msg-compose-suggestion-headline">${escHtml(u.headline || '')}</span>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-compose-id]').forEach(el =>
    el.addEventListener('click', () => {
      const user = state.composeResults.find(u => u.id === el.dataset.composeId);
      if (!user) return;
      state.composeRecipient = user;

      // Render chosen chip, show body
      const chosen = modal.querySelector('[data-compose-chosen]');
      chosen.innerHTML = `
        <span class="msg-compose-chip">
          <img src="${escAttr(user.profilePic || '/images/profile.jpg')}" alt="">
          ${escHtml(user.name || user.email)}
          <button type="button" data-remove-recipient>&times;</button>
        </span>
      `;
      chosen.classList.remove('hidden');
      chosen.querySelector('[data-remove-recipient]')?.addEventListener('click', () => {
        state.composeRecipient = null;
        chosen.innerHTML = '';
        chosen.classList.add('hidden');
        modal.querySelector('[data-compose-body]').classList.add('hidden');
        modal.querySelector('[data-compose-send]').disabled = true;
      });

      wrap.innerHTML = '';
      modal.querySelector('[data-compose-body]').classList.remove('hidden');
      setTimeout(() => modal.querySelector('[data-compose-input]').focus(), 40);
    }));
}

// ── Store hooks ──────────────────────────────────────────────
function wireStore() {
  store.on('message:openWith', ({ userId }) => {
    // From a connection card "Message" button
    const existing = state.conversations.find(c => c.participants.some(p => p.id === userId));
    if (existing) { openThread(existing); return; }
    // Otherwise open compose pre-filled with this user
    openComposeModal();
    api.search('').then(res => {
      const user = (res.users || []).find(u => u.id === userId);
      if (user) {
        state.composeResults = [user];
        renderComposeSuggestions();
      }
    }).catch(() => {});
  });
}

// ── Socket wiring ────────────────────────────────────────────
function wireSocket() {
  const onNewMessage = (msg) => {
    const list = state.messages.get(msg.conversationId) || [];
    if (!list.some(m => m.id === msg.id)) {
      list.push(msg);
      state.messages.set(msg.conversationId, list);
    }

    // Update conversation summary
    const conv = state.conversations.find(c => c.id === msg.conversationId);
    if (conv) {
      conv.lastMessage = { ...msg };
      conv.updatedAt = msg.createdAt;

      if (state.activeId === msg.conversationId) {
        appendMessage(msg);
        if (msg.senderId !== getUser()?.id) {
          // Auto mark as read when viewing
          socket.emit('markAsRead', { conversationId: conv.id, lastReadMessageId: msg.id });
        }
      } else if (msg.senderId !== getUser()?.id) {
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }
      renderConversations();
    } else {
      // New conversation we didn't know about — refresh list
      loadConversations();
    }
  };

  const onReadReceipt = ({ conversationId, lastReadMessageId }) => {
    if (state.activeId !== conversationId) return;
    const list = state.messages.get(conversationId) || [];
    const idx = list.findIndex(m => m.id === lastReadMessageId);
    if (idx >= 0) {
      for (let i = 0; i <= idx; i++) list[i].read = true;
    } else {
      list.forEach(m => { m.read = true; });
    }
    renderMessages();
  };

  const onTyping = ({ conversationId, userId, typing }) => {
    if (!state.typingUsers.has(conversationId)) state.typingUsers.set(conversationId, new Set());
    const set = state.typingUsers.get(conversationId);
    if (typing) set.add(userId); else set.delete(userId);

    if (state.activeId === conversationId) {
      renderTypingIndicator();
    }
  };

  const onDisconnect = () => {
    console.warn('[messaging] socket disconnected');
  };

  handlers.push(
    socket.on('newMessage',  onNewMessage),
    socket.on('readReceipt', onReadReceipt),
    socket.on('typing',      onTyping),
    socket.on('disconnect',  onDisconnect),
  );
}

// ── Data loading ─────────────────────────────────────────────
async function loadConversations() {
  socket.emit('getConversations', {}, (res) => {
    state.conversations = res?.conversations || [];
    renderConversations();

    // Auto-open first focused conversation on wide screens
    if (!state.activeId && window.innerWidth >= 900) {
      const first = state.conversations.find(c => c.focused);
      if (first) openThread(first);
    }
  });
}

async function openThread(conv) {
  state.activeId = conv.id;
  renderConversations();      // highlight active
  root.querySelector('[data-msg-empty]')?.classList.add('hidden');
  root.querySelector('[data-msg-active]')?.classList.remove('hidden');

  // Header
  const other = conv.participants[0];
  root.querySelector('[data-thread-avatar]').src = other?.avatar || '/images/profile.jpg';
  root.querySelector('[data-thread-name]').textContent = other?.name || '';
  const statusEl = root.querySelector('[data-thread-status]');
  statusEl.textContent = other?.online ? 'Active now' : other?.headline || 'Offline';
  statusEl.classList.toggle('online', !!other?.online);

  updateStarIcon(!!conv.starred);

  // Clear old messages, request fresh
  state.messages.set(conv.id, state.messages.get(conv.id) || []);
  messagesEl.innerHTML = '<div class="msg-loading"><div class="spinner"></div></div>';

  socket.emit('getMessages', { conversationId: conv.id, limit: 30 }, (res) => {
    state.messages.set(conv.id, res?.messages || []);
    renderMessages();
    scrollToBottom();
  });

  // Mark as read
  const last = (state.messages.get(conv.id) || []).at(-1);
  if (last) {
    socket.emit('markAsRead', { conversationId: conv.id, lastReadMessageId: last.id });
  }
  conv.unreadCount = 0;
  renderConversations();
}

function closeThread() {
  state.activeId = null;
  root.querySelector('[data-msg-empty]')?.classList.remove('hidden');
  root.querySelector('[data-msg-active]')?.classList.add('hidden');
}

// ── Rendering ────────────────────────────────────────────────
function renderConversations() {
  const visible = state.conversations
    .filter(c => (state.filter === 'focused' ? c.focused : !c.focused))
    .filter(c => {
      if (!state.query) return true;
      const other = c.participants[0];
      const hay = `${other?.name || ''} ${c.lastMessage?.content || ''}`.toLowerCase();
      return hay.includes(state.query);
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const focusedCount = state.conversations.filter(c => c.focused && c.unreadCount > 0).length;
  const otherCount   = state.conversations.filter(c => !c.focused && c.unreadCount > 0).length;

  updateCount(root.querySelector('[data-count-focused]'), focusedCount);
  updateCount(root.querySelector('[data-count-other]'),   otherCount);

  if (!visible.length) {
    listEl.innerHTML = `<p class="msg-empty-list">${state.query ? 'No matches.' : `No conversations in ${state.filter}.`}</p>`;
    return;
  }

  listEl.innerHTML = visible.map(conv => convHTML(conv)).join('');
  listEl.querySelectorAll('[data-conv-id]').forEach(el =>
    el.addEventListener('click', () => {
      const conv = state.conversations.find(c => c.id === el.dataset.convId);
      if (conv) openThread(conv);
    }));
}

function convHTML(conv) {
  const other = conv.participants[0] || {};
  const unread = (conv.unreadCount || 0) > 0;
  const preview = formatPreview(conv.lastMessage, other);
  return `
    <div class="msg-conv ${unread ? 'unread' : ''} ${conv.id === state.activeId ? 'active' : ''}"
         data-conv-id="${escAttr(conv.id)}">
      <div class="msg-conv-avatar-wrap">
        <img src="${escAttr(other.avatar || '/images/profile.jpg')}" alt="" class="msg-conv-avatar">
        <span class="msg-conv-presence ${other.online ? '' : 'offline'}"></span>
      </div>
      <div class="msg-conv-body">
        <div class="msg-conv-row1">
          <span class="msg-conv-name">${escHtml(other.name || 'Unknown')}</span>
          <span class="msg-conv-time">${timeAgo(conv.updatedAt)}</span>
        </div>
        <div class="msg-conv-preview">${escHtml(preview)}</div>
      </div>
    </div>
  `;
}

function renderMessages() {
  const list = state.messages.get(state.activeId) || [];
  if (!list.length) {
    messagesEl.innerHTML = '';
    return;
  }

  const myId = getUser()?.id || 'me';
  let out = '';
  let lastDate = null;

  list.forEach((m, i) => {
    const d = new Date(m.createdAt);
    const dayKey = d.toDateString();
    if (dayKey !== lastDate) {
      out += `<div class="msg-date-sep">${formatDay(m.createdAt)}</div>`;
      lastDate = dayKey;
    }
    const prev = list[i - 1];
    const next = list[i + 1];
    const mine = m.senderId === myId;
    const sameAsPrev = prev && prev.senderId === m.senderId &&
                       (m.createdAt - prev.createdAt) < 5 * 60 * 1000;
    const sameAsNext = next && next.senderId === m.senderId &&
                       (next.createdAt - m.createdAt) < 5 * 60 * 1000;

    out += `
      <div class="msg-bubble ${mine ? 'mine' : 'theirs'} ${m.read ? 'read' : ''} ${sameAsPrev ? 'stacked-top' : ''} ${sameAsNext ? 'stacked-bottom' : ''}">
        <div class="msg-bubble-inner">
          ${escapeAndLinkify(m.content)}
          ${m.mediaUrl ? `<img class="msg-bubble-media" src="${escAttr(m.mediaUrl)}" alt="">` : ''}
          ${!sameAsNext ? `<span class="msg-bubble-time">${formatTime(m.createdAt)}</span>` : ''}
        </div>
      </div>
    `;
  });

  messagesEl.innerHTML = out;
}

function appendMessage(msg) {
  const list = state.messages.get(msg.conversationId) || [];
  if (!list.some(m => m.id === msg.id)) list.push(msg);
  state.messages.set(msg.conversationId, list);
  if (state.activeId === msg.conversationId) {
    renderMessages();
    scrollToBottom();
  }
}

function renderTypingIndicator() {
  const typingSet = state.typingUsers.get(state.activeId);
  if (!typingSet || !typingSet.size) {
    typingEl.classList.add('hidden');
    return;
  }
  const conv = state.conversations.find(c => c.id === state.activeId);
  const other = conv?.participants[0];
  typingEl.classList.remove('hidden');
  typingEl.querySelector('[data-typing-name]').textContent = `${other?.name?.split(' ')[0] || 'Someone'} is typing…`;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

// ── Utilities ────────────────────────────────────────────────
function updateCount(el, n) {
  if (!el) return;
  if (n > 0) { el.textContent = String(n); el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

function formatPreview(msg, other) {
  if (!msg) return 'No messages yet';
  const mine = msg.senderId === getUser()?.id;
  const prefix = mine ? 'You: ' : '';
  return prefix + (msg.content || (msg.mediaUrl ? '📷 Photo' : ''));
}

function formatDay(ms) {
  const d = new Date(ms);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (isToday) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function timeAgo(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60)     return 'now';
  if (s < 3600)   return `${Math.floor(s / 60)}m`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeAndLinkify(text) {
  const safe = String(text ?? '')
    .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  return safe.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const escAttr = escHtml;

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}