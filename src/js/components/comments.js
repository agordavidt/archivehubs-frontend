import { api }   from '../core/api.js';
import { store } from '../core/store.js';
import { getUser } from '../core/session.js';

let modal, currentPost;

export function initComments() {
  modal = document.getElementById('commentModal');
  if (!modal) { console.warn('[comments] #commentModal not found'); return; }

  modal.querySelector('.close-modal-btn')?.addEventListener('click', close);
  modal.querySelector('.post-comment-btn')?.addEventListener('click', submit);
  modal.querySelector('.comment-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  store.on('comment:open', ({ post }) => open(post));
}

async function open(post) {
  currentPost = post;
  modal.classList.add('active');

  const container = modal.querySelector('.comments-container');
  container.innerHTML = `<div class="comment-loading"><div class="spinner"></div></div>`;

  try {
    const { comments } = await api.getComments(post.id);
    container.innerHTML = '';
    if (!comments.length) {
      container.innerHTML = `<p class="comments-empty">No comments yet. Be the first.</p>`;
      return;
    }
    renderTree(comments, container);
  } catch (e) {
    console.error('[comments] load failed:', e);
    container.innerHTML = `<p class="comments-empty">Failed to load comments.</p>`;
  }
}

function renderTree(comments, parent) {
  const byParent = new Map();
  for (const c of comments) {
    const key = c.parentId || '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c);
  }
  (byParent.get('__root__') || []).forEach(c =>
    parent.appendChild(renderComment(c, byParent, 0)));
}

function renderComment(c, byParent, depth) {
  const wrap = document.createElement('div');
  wrap.className = 'comment-thread';

  const el = document.createElement('div');
  el.className = 'comment-item';
  el.style.paddingLeft = `${16 + depth * 28}px`;
  el.innerHTML = `
    <img class="comment-avatar" src="${escAttr(c.author?.profilePic || 'images/profile.jpg')}" alt="">
    <div class="comment-body">
      <div class="comment-author">${escHtml(c.author?.name || 'Unknown')}</div>
      <div class="comment-text">${escHtml(c.text)}</div>
      <div class="comment-meta">${formatTime(c.createdAt)}</div>
    </div>
  `;

  wrap.appendChild(el);

  const replies = byParent.get(c.id) || [];
  replies.forEach(r => wrap.appendChild(renderComment(r, byParent, depth + 1)));

  return wrap;
}

async function submit() {
  if (!currentPost) return;
  const input = modal.querySelector('.comment-input');
  const text  = input.value.trim();
  if (!text) return;

  const btn = modal.querySelector('.post-comment-btn');
  btn.disabled = true;
  btn.textContent = 'Posting…';

  try {
    const { comment } = await api.addComment(currentPost.id, text);
    input.value = '';

    const me = getUser();
    const full = {
      id:        comment.id,
      text:      comment.text,
      createdAt: comment.createdAt,
      parentId:  null,
      author: me ? {
        id:         me.id,
        name:       `${me.firstName} ${me.lastName}`.trim(),
        profilePic: me.profilePic || 'images/profile.jpg',
      } : { id: 'me', name: 'You', profilePic: 'images/profile.jpg' },
    };

    const container = modal.querySelector('.comments-container');
    container.querySelector('.comments-empty')?.remove();
    container.appendChild(renderComment(full, new Map(), 0));

    store.emit('comment:created', { postId: currentPost.id });
  } catch (e) {
    console.error('[comments] post failed:', e);
    alert('Could not post comment. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Post';
  }
}

function close() {
  modal.classList.remove('active');
  currentPost = null;
}

function formatTime(ms) {
  const d = Date.now() - ms;
  if (d < 60_000)     return 'Just now';
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return new Date(ms).toLocaleDateString();
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const escAttr = escHtml;