import { api }        from '../core/api.js';
import { store }      from '../core/store.js';
import { renderPost } from './post-card.js';

let container, sentinel, io;
let page = 0;
let loading = false;
let exhausted = false;
const renderedIds = new Set();

export function initFeed(el) {
  container = el;
  container.innerHTML = '';
  renderedIds.clear();
  page = 0;
  loading = false;
  exhausted = false;

  renderSkeleton(3);

  sentinel = document.createElement('div');
  sentinel.className = 'feed-sentinel';
  container.after(sentinel);

  io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) loadNext();
  }, { rootMargin: '400px' });
  io.observe(sentinel);

  store.on('post:created', prependPost);
  store.on('post:deleted', ({ id }) => {
    container.querySelector(`[data-post-id="${id}"]`)?.remove();
    renderedIds.delete(id);
  });
  store.on('comment:created', ({ postId }) => {
    const root = container.querySelector(`[data-post-id="${postId}"]`);
    if (!root) return;
    const trigger = root.querySelector('[data-action="comment"].comment-trigger');
    if (!trigger) return;
    const n = (parseInt(trigger.textContent, 10) || 0) + 1;
    trigger.textContent = `${n} ${n === 1 ? 'comment' : 'comments'}`;
  });

  loadNext();
}

function renderSkeleton(count) {
  container.innerHTML = Array.from({ length: count }).map(() => `
    <article class="post-skeleton" aria-hidden="true">
      <div class="sk-header">
        <div class="sk-avatar"></div>
        <div class="sk-lines">
          <div class="sk-line sk-line-40"></div>
          <div class="sk-line sk-line-25"></div>
        </div>
      </div>
      <div class="sk-line sk-line-80"></div>
      <div class="sk-line sk-line-60" style="margin-top:8px"></div>
      <div class="sk-image"></div>
      <div class="sk-footer">
        <div class="sk-line"></div>
        <div class="sk-line"></div>
        <div class="sk-line"></div>
      </div>
    </article>
  `).join('');
}

async function loadNext() {
  if (loading || exhausted || !container) return;
  loading = true;

  try {
    const { posts } = await api.getFeed({ paginate: page });

    // Clear skeletons on first successful load
    if (page === 0) container.innerHTML = '';

    const frag = document.createDocumentFragment();
    let added = 0;
    for (const p of posts) {
      if (renderedIds.has(p.id)) continue;
      renderedIds.add(p.id);
      frag.appendChild(renderPost(p));
      added += 1;
    }

    if (added === 0 && page > 0) {
      exhausted = true;
      sentinel.remove();
      io.disconnect();
    } else {
      container.appendChild(frag);
      page += 1;
    }
  } catch (e) {
    console.error('[feed] load failed:', e);
    if (page === 0) {
      container.innerHTML = `<div class="feed-error">Failed to load posts. <button data-retry>Retry</button></div>`;
      container.querySelector('[data-retry]')?.addEventListener('click', () => {
        loading = false;
        renderSkeleton(3);
        loadNext();
      });
    }
  } finally {
    loading = false;
  }
}

function prependPost(post) {
  const el = renderPost(post);
  container.prepend(el);
  renderedIds.add(post.id);
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function reloadFeed() {
  container.innerHTML = '';
  renderedIds.clear();
  page = 0;
  exhausted = false;
  loading = false;
  renderSkeleton(3);
  if (!sentinel.isConnected) container.after(sentinel);
  io.observe(sentinel);
  loadNext();
}