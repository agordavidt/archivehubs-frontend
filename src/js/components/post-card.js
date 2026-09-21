import { api } from '../core/api.js';
import { store } from '../core/store.js';

/** @param {import('../core/schemas.js').FeedPost} post */
export function renderPost(post) {
  const el = document.createElement('article');
  el.className = 'post';
  el.dataset.postId = post.id;

  el.innerHTML = `
    <header class="post-header">
      <div class="post-author-info">
        <img class="post-profile-pic" src="${escAttr(post.userProfilePic)}" alt="">
        <div>
          <h3 class="post-author-name">${escHtml(post.authorName)}</h3>
          <span class="post-meta">${formatTime(post.createdAt)}</span>
        </div>
      </div>
      <button class="more-options" aria-label="More"><i class="fas fa-ellipsis-h"></i></button>
    </header>
    <div class="post-content">
      <p>${escHtml(post.textContent)}</p>
      ${renderMedia(post.mediaUrls)}
    </div>
    <div class="post-metrics">
      <div class="metrics-left">
        <span class="metric">
          <i class="fas fa-thumbs-up"></i>
          <span class="metric-count" data-like-count>${post.likeCount}</span>
        </span>
        <span class="metric-dot">•</span>
        <span class="metric comment-trigger" data-action="comment">
          ${post.commentCount} ${post.commentCount === 1 ? 'comment' : 'comments'}
        </span>
      </div>
    </div>
    <div class="post-actions">
      <button class="action-btn like-btn ${post.isLiked ? 'liked' : ''}" data-action="like">
        <i class="fas fa-thumbs-up"></i><span>Like</span>
      </button>
      <button class="action-btn" data-action="comment">
        <i class="fas fa-comment"></i><span>Comment</span>
      </button>
      <button class="action-btn" data-action="share">
        <i class="fas fa-share"></i><span>Share</span>
      </button>
    </div>
  `;

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'like')    toggleLike(post.id, el, btn);
    if (action === 'comment') store.emit('comment:open', { post });
    if (action === 'share')   store.emit('share:open',   { post });
  });

  return el;
}

async function toggleLike(postId, root, btn) {
  const wasLiked = btn.classList.contains('liked');
  const countEl  = root.querySelector('[data-like-count]');
  const before   = parseInt(countEl.textContent, 10) || 0;

  // Optimistic
  btn.classList.toggle('liked', !wasLiked);
  countEl.textContent = wasLiked ? before - 1 : before + 1;
  countEl.classList.add('updating');
  setTimeout(() => countEl.classList.remove('updating'), 350);

  try {
    await (wasLiked ? api.unlikePost(postId) : api.likePost(postId));
  } catch (e) {
    // Rollback
    btn.classList.toggle('liked', wasLiked);
    countEl.textContent = before;
    console.error('[post-card] like failed:', e);
  }
}

function renderMedia(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return '';
  return urls.map(u =>
    `<img class="post-image" src="${escAttr(u)}" alt="" loading="lazy">`
  ).join('');
}

function formatTime(ms) {
  const diff = Date.now() - ms;
  if (diff < 60_000)          return 'Just now';
  if (diff < 3_600_000)       return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000)      return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000)     return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(ms).toLocaleDateString();
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const escAttr = escHtml;