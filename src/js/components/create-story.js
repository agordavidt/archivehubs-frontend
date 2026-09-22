import { api }   from '../core/api.js';
import { store } from '../core/store.js';
import { getUser, getAccountDisplayName, getAccountAvatar } from '../core/session.js';

// ── Constants ────────────────────────────────────────────────
const BG_COLOURS = [
  '#4a90e2', '#f7d000', '#ff5c5c', '#16a34a', '#7b61ff',
  '#f97316', '#0ea5e9', '#111827', '#ec4899', '#facc15',
  '#10b981', '#8b5cf6',
];
const TEXT_COLOURS = ['#ffffff', '#000000', '#f7d000', '#ff5c5c', '#1877f2', '#16a34a'];
const FONTS = [
  { label: 'Poppins',    value: "'Poppins', sans-serif" },
  { label: 'Georgia',    value: 'Georgia, serif' },
  { label: 'Courier',    value: "'Courier New', monospace" },
  { label: 'Impact',     value: 'Impact, sans-serif' },
  { label: 'Comic Sans', value: "'Comic Sans MS', cursive" },
];

// ── State ────────────────────────────────────────────────────
let modal, dropZone, previewImg, previewVideo, previewBg, uploadHint;
let textOverlay, addTextBtn, removeTextBtn, removeMediaBtn;
let fileInput, postBtn;
let file           = null;      // File
let fileUrl        = null;      // Object URL
let kind           = null;      // 'image' | 'video' | null
let bgColour       = BG_COLOURS[0];
let textColour     = TEXT_COLOURS[0];
let fontFamily     = FONTS[0].value;
let textSize       = 18;
let hasText        = false;

// ── Init ─────────────────────────────────────────────────────
export function initCreateStory() {
  modal = document.getElementById('createStoryModal');
  if (!modal) { console.warn('[create-story] modal not found'); return; }

  dropZone       = modal.querySelector('[data-cs-dropzone]');
  previewImg     = modal.querySelector('[data-cs-preview-img]');
  previewVideo   = modal.querySelector('[data-cs-preview-video]');
  previewBg      = modal.querySelector('[data-cs-preview-bg]');
  uploadHint     = modal.querySelector('[data-cs-upload-hint]');
  textOverlay    = modal.querySelector('[data-cs-text]');
  addTextBtn     = modal.querySelector('[data-cs-add-text]');
  removeTextBtn  = modal.querySelector('[data-cs-remove-text]');
  removeMediaBtn = modal.querySelector('[data-cs-remove-media]');
  fileInput      = modal.querySelector('[data-cs-file-input]');
  postBtn        = modal.querySelector('[data-cs-post]');

  // Open triggers
  document.querySelectorAll('[data-open-create-story]').forEach(el =>
    el.addEventListener('click', open));

  wireClose();
  wireUpload();
  wireTextControls();
  wireFonts();
  wireSize();
  wireColours();
  wireSubmit();

  renderBgSwatches();
  renderTextSwatches();
  renderFontSelect();
  updatePreview();
}

// ── Open / close ─────────────────────────────────────────────
function open() {
  reset();
  modal.classList.remove('hidden');
}

function close() {
  modal.classList.add('hidden');
}

function wireClose() {
  modal.querySelectorAll('[data-close-story]').forEach(el =>
    el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });
}

function reset() {
  if (fileUrl) URL.revokeObjectURL(fileUrl);
  file = null; fileUrl = null; kind = null;
  bgColour = BG_COLOURS[0];
  textColour = TEXT_COLOURS[0];
  fontFamily = FONTS[0].value;
  textSize = 18;
  hasText = false;
  textOverlay.textContent = '';
  textOverlay.classList.add('hidden');
  addTextBtn.classList.remove('hidden');
  removeTextBtn.classList.add('hidden');
  removeMediaBtn.classList.add('hidden');
  previewImg.classList.add('hidden');
  previewVideo.classList.add('hidden');
  uploadHint.classList.remove('hidden');
  updatePreview();
  updatePostBtn();
  renderBgSwatches();
  renderTextSwatches();
}

// ── Upload ───────────────────────────────────────────────────
function wireUpload() {
  modal.querySelector('[data-cs-upload]')?.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('click', (e) => {
    // Only trigger file picker if the click isn't on the text overlay
    if (e.target === textOverlay || textOverlay.contains(e.target)) return;
    if (file) return; // already has media
    fileInput.click();
  });
  fileInput.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    fileInput.value = '';
  });

  // Drag & drop
  ['dragenter', 'dragover'].forEach(ev =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.style.background = 'rgba(247,208,0,0.08)';
    }));
  ['dragleave', 'drop'].forEach(ev =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.style.background = '';
    }));
  dropZone.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type.startsWith('image/') || f.type.startsWith('video/'))) setFile(f);
  });

  removeMediaBtn.addEventListener('click', () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    file = null; fileUrl = null; kind = null;
    previewImg.classList.add('hidden');
    previewVideo.classList.add('hidden');
    uploadHint.classList.remove('hidden');
    removeMediaBtn.classList.add('hidden');
    updatePostBtn();
  });
}

function setFile(f) {
  if (fileUrl) URL.revokeObjectURL(fileUrl);
  file = f;
  fileUrl = URL.createObjectURL(f);
  kind = f.type.startsWith('video/') ? 'video' : 'image';

  if (kind === 'image') {
    previewImg.src = fileUrl;
    previewImg.classList.remove('hidden');
    previewVideo.classList.add('hidden');
  } else {
    previewVideo.src = fileUrl;
    previewVideo.classList.remove('hidden');
    previewImg.classList.add('hidden');
  }
  uploadHint.classList.add('hidden');
  removeMediaBtn.classList.remove('hidden');
  updatePostBtn();
}

// ── Text ─────────────────────────────────────────────────────
function wireTextControls() {
  addTextBtn.addEventListener('click', () => {
    textOverlay.classList.remove('hidden');
    hasText = true;
    addTextBtn.classList.add('hidden');
    removeTextBtn.classList.remove('hidden');
    setTimeout(() => textOverlay.focus(), 30);
    updatePostBtn();
  });

  removeTextBtn.addEventListener('click', () => {
    textOverlay.textContent = '';
    textOverlay.classList.add('hidden');
    hasText = false;
    removeTextBtn.classList.add('hidden');
    addTextBtn.classList.remove('hidden');
    updatePostBtn();
  });

  textOverlay.addEventListener('input', () => {
    hasText = textOverlay.textContent.trim().length > 0;
    updatePostBtn();
  });

  modal.querySelector('[data-cs-bold]')?.addEventListener('click', () => {
    textOverlay.focus();
    document.execCommand('bold');
  });
  modal.querySelector('[data-cs-italic]')?.addEventListener('click', () => {
    textOverlay.focus();
    document.execCommand('italic');
  });
}

// ── Fonts ────────────────────────────────────────────────────
function renderFontSelect() {
  const sel = modal.querySelector('[data-cs-font]');
  sel.innerHTML = FONTS.map(f => `<option value="${f.value}">${f.label}</option>`).join('');
  sel.value = fontFamily;
  sel.addEventListener('change', (e) => {
    fontFamily = e.target.value;
    updatePreview();
  });
}

// ── Size ─────────────────────────────────────────────────────
function wireSize() {
  const range = modal.querySelector('[data-cs-text-size]');
  const label = modal.querySelector('[data-cs-text-size-value]');
  range.value = textSize;
  label.textContent = `${textSize}px`;
  range.addEventListener('input', (e) => {
    textSize = Number(e.target.value);
    label.textContent = `${textSize}px`;
    updatePreview();
  });
}

// ── Colours ──────────────────────────────────────────────────
function renderBgSwatches() {
  const wrap = modal.querySelector('[data-cs-bg-swatches]');
  wrap.innerHTML = BG_COLOURS.map(c =>
    `<button type="button" class="cs-swatch ${c === bgColour ? 'active' : ''}" style="background:${c}" data-bg="${c}" aria-label="${c}"></button>`
  ).join('');
  wrap.onclick = (e) => {
    const btn = e.target.closest('[data-bg]');
    if (!btn) return;
    bgColour = btn.dataset.bg;
    renderBgSwatches();
    updatePreview();
  };
}

function renderTextSwatches() {
  const wrap = modal.querySelector('[data-cs-text-swatches]');
  wrap.innerHTML = TEXT_COLOURS.map(c =>
    `<button type="button" class="cs-swatch ${c === textColour ? 'active' : ''}" style="background:${c}; border:2px solid var(--border-color);" data-text-colour="${c}" aria-label="${c}"></button>`
  ).join('');
  wrap.onclick = (e) => {
    const btn = e.target.closest('[data-text-colour]');
    if (!btn) return;
    textColour = btn.dataset.textColour;
    renderTextSwatches();
    updatePreview();
  };
}

function wireColours() {
  // handled in render functions
}

// ── Preview update ──────────────────────────────────────────
function updatePreview() {
  previewBg.style.background = bgColour;
  textOverlay.style.fontFamily = fontFamily;
  textOverlay.style.fontSize   = `${textSize}px`;
  textOverlay.style.color      = textColour;
}

// ── Post button state ──────────────────────────────────────
function updatePostBtn() {
  postBtn.disabled = !file && !hasText;
}

// ── Submit ───────────────────────────────────────────────────
function wireSubmit() {
  modal.querySelector('[data-cs-discard]')?.addEventListener('click', () => {
    if (confirm('Discard this story?')) close();
  });
  postBtn.addEventListener('click', submit);
}

async function submit() {
  if (!file && !hasText) return;
  postBtn.disabled = true;
  const original = postBtn.textContent;
  postBtn.textContent = 'Posting…';

  const me = getUser();
  const optimistic = {
    id: 'temp-story-' + Date.now(),
    mediaUrls: fileUrl ? [fileUrl] : [],
    kind,
    caption: textOverlay.textContent.trim(),
    bg: bgColour,
    textColour,
    fontFamily,
    textSize,
    authorName: me ? getAccountDisplayName(me) : 'You',
    authorAvatar: me ? getAccountAvatar(me) : '/images/profile.jpg',
    createdAt: Date.now(),
    _pending: true,
  };
  store.emit('story:created', optimistic);

  try {
    const res = await api.createStory({
      media: file,
      caption: textOverlay.textContent.trim(),
      bg: bgColour,
      font: fontFamily,
      size: textSize,
      colour: textColour,
    });
    store.emit('story:deleted', { id: optimistic.id });
    store.emit('story:created', res.story || optimistic);
    close();
  } catch (e) {
    console.error('[create-story] failed:', e);
    store.emit('story:deleted', { id: optimistic.id });
    alert(e.message || 'Could not publish story. Please try again.');
    postBtn.disabled = false;
  } finally {
    postBtn.textContent = original;
  }
}