import { api }   from '../core/api.js';
import { store } from '../core/store.js';
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

async function loadNext() {
  if (loading || exhausted || !container) return;
  loading = true;

  try {
    const { posts } = await api.getFeed({ paginate: page });
    // Backend (and our mock) return the accumulated list each call.
    // Dedupe by ID so we only ever render each post once.
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
    container.insertAdjacentHTML('beforeend',
      `<div class="feed-error">Failed to load posts. <button data-retry>Retry</button></div>`);
    container.querySelector('[data-retry]')?.addEventListener('click', () => {
      container.querySelector('.feed-error')?.remove();
      loading = false;
      loadNext();
    });
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
  if (!sentinel.isConnected) container.after(sentinel);
  io.observe(sentinel);
  loadNext();
}