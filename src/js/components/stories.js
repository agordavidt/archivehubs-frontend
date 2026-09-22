import { api }   from '../core/api.js';
import { store } from '../core/store.js';
import { getUser, getAccountDisplayName, getAccountAvatar } from '../core/session.js';

// ── State ────────────────────────────────────────────────────
let container;            // .stories-container
let viewer;               // #storyViewer
let list = [];            // story array
let currentIndex = -1;
let autoTimer = null;
let progressTimer = null;
const AUTO_MS = 5000;

// ── Init ─────────────────────────────────────────────────────
export async function initStories() {
  container = document.querySelector('.stories-container');
  if (!container) { console.warn('[stories] container not found'); return; }

  viewer = document.getElementById('storyViewer');
  wireViewer();

  store.on('story:created', (story) => {
    list.unshift(story);
    renderRow();
  });
  store.on('story:deleted', ({ id }) => {
    list = list.filter(s => s.id !== id);
    renderRow();
  });

  try {
    const { stories } = await api.getStories();
    list = stories || [];
  } catch (e) {
    console.warn('[stories] load failed:', e);
    list = [];
  }
  renderRow();
}

// ── Row rendering ────────────────────────────────────────────
function renderRow() {
  // Keep the "Create Story" tile; wipe the rest
  const createTile = container.querySelector('.create-story');
  container.innerHTML = '';
  if (createTile) container.appendChild(createTile);

  list.forEach((story, idx) => {
    container.appendChild(buildCard(story, idx));
  });
}

function buildCard(story, idx) {
  const card = document.createElement('div');
  card.className = 'story-card story-card-view';
  card.dataset.storyId = story.id;
  card.dataset.index = String(idx);

  const hasMedia = Array.isArray(story.mediaUrls) && story.mediaUrls.length > 0;

  card.innerHTML = `
    ${hasMedia
      ? `<img src="${escAttr(story.mediaUrls[0])}" alt="" class="story-media-fill">`
      : `<div class="story-media-fill story-media-bg" style="background:${escAttr(story.bg || '#4a90e2')}">
           <span class="story-media-text">${escHtml(story.caption || '')}</span>
         </div>`}
    <div class="story-gradient"></div>
    <img src="${escAttr(story.authorAvatar || '/images/profile.jpg')}" alt="" class="story-avatar">
    <span class="story-username">${escHtml(shortName(story.authorName))}</span>
  `;

  card.addEventListener('click', () => openViewer(idx));
  return card;
}

// ── Viewer ───────────────────────────────────────────────────
function wireViewer() {
  if (!viewer) return;

  viewer.querySelectorAll('[data-sv-close]').forEach(el =>
    el.addEventListener('click', closeViewer));
  viewer.querySelector('[data-sv-prev]')?.addEventListener('click', () => step(-1));
  viewer.querySelector('[data-sv-next]')?.addEventListener('click', () => step(1));

  document.addEventListener('keydown', (e) => {
    if (viewer.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
}

function openViewer(index) {
  if (!list.length) return;
  currentIndex = index;
  viewer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  renderStory();
}

function closeViewer() {
  viewer.classList.add('hidden');
  document.body.style.overflow = '';
  currentIndex = -1;
  stopTimers();
}

function step(delta) {
  if (currentIndex < 0) return;
  const next = currentIndex + delta;
  if (next < 0) { currentIndex = 0; renderStory(); return; }
  if (next >= list.length) { closeViewer(); return; }
  currentIndex = next;
  renderStory();
}

function renderStory() {
  const story = list[currentIndex];
  if (!story) { closeViewer(); return; }

  const img   = viewer.querySelector('[data-sv-media-img]');
  const video = viewer.querySelector('[data-sv-media-video]');
  const text  = viewer.querySelector('[data-sv-text]');
  const prog  = viewer.querySelector('[data-sv-progress]');

  // Reset
  img.classList.add('hidden');
  video.classList.add('hidden');
  text.classList.add('hidden');
  video.pause?.();
  video.removeAttribute('src');

  const hasMedia = Array.isArray(story.mediaUrls) && story.mediaUrls.length > 0;
  const url = hasMedia ? story.mediaUrls[0] : null;
  const isVideo = url && /\.(mp4|webm|ogg|mov)$/i.test(url);

  if (isVideo) {
    video.src = url;
    video.classList.remove('hidden');
    video.play().catch(() => {});
  } else if (url) {
    img.src = url;
    img.classList.remove('hidden');
  } else {
    // Text-only story
    text.textContent = story.caption || '';
    text.style.background = story.bg || '#4a90e2';
    text.style.color = story.colour || '#ffffff';
    text.style.fontFamily = story.font || 'inherit';
    text.style.fontSize = `${story.size || 26}px`;
    text.classList.remove('hidden');
  }

  viewer.querySelector('[data-sv-avatar]').src = story.authorAvatar || '/images/profile.jpg';
  viewer.querySelector('[data-sv-name]').textContent = story.authorName || '';
  viewer.querySelector('[data-sv-time]').textContent = timeAgo(story.createdAt);

  prog.style.width = '0%';
  startTimers();
}

function startTimers() {
  stopTimers();
  const prog = viewer.querySelector('[data-sv-progress]');
  const start = Date.now();

  progressTimer = setInterval(() => {
    const pct = Math.min(100, ((Date.now() - start) / AUTO_MS) * 100);
    prog.style.width = `${pct}%`;
  }, 50);

  autoTimer = setTimeout(() => step(1), AUTO_MS);
}

function stopTimers() {
  clearInterval(progressTimer);
  clearTimeout(autoTimer);
  progressTimer = autoTimer = null;
}

// ── Utilities ────────────────────────────────────────────────
function shortName(full) {
  if (!full) return '';
  const parts = String(full).trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

function timeAgo(ms) {
  const diff = Date.now() - (ms || Date.now());
  const s = Math.floor(diff / 1000);
  if (s < 60)        return 'just now';
  if (s < 3600)      return `${Math.floor(s / 60)}m`;
  if (s < 86400)     return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const escAttr = escHtml;