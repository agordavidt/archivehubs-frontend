import { api }              from '../core/api.js';
import { store }            from '../core/store.js';
import { getUser, getAccountDisplayName, getAccountAvatar } from '../core/session.js';

// ── Module state ─────────────────────────────────────────────
let modal, editor, mediaGrid, postBtn;
let files        = [];              // { id, file, url, kind:'image'|'video' }
let taggedUsers  = [];              // { id, name, avatar }
let location     = null;
let audience     = { id: 'connections', label: 'Connections', icon: 'groups' };
let nextFileId   = 1;

const BG_COLOURS   = ['#ffffff', '#f7d000', '#ff5c5c', '#1877f2', '#16a34a',
                      '#7b61ff', '#f97316', '#000000', '#e4e6eb', '#fde047',
                      '#a78bfa', '#fb7185'];
const TEXT_COLOURS = ['#1c1e21', '#ffffff', '#f7d000', '#1877f2', '#dc2626',
                      '#16a34a', '#7b61ff', '#f97316'];
const EMOJIS       = [
  '😀','😂','😍','🥰','😎','🤔','😴','😅','🙄','😢',
  '😡','🤯','🥳','😇','🤗','🤐','🤢','🤮','🥶','🤠',
  '👍','👎','👏','🙏','👌','✌️','🤝','💪','🫡','🫶',
  '❤️','💛','💚','💙','💜','🖤','🤍','💔','💖','💝',
  '🎉','🔥','✨','⭐','💯','✅','❌','⚠️','📌','💡',
];

const AUDIENCES = [
  { id: 'public',      label: 'Public',       icon: 'public',       desc: 'Anyone on or off ArchiveHubs' },
  { id: 'connections', label: 'Connections',  icon: 'groups',       desc: 'Your connections only'        },
  { id: 'private',     label: 'Only me',      icon: 'lock',         desc: 'Only visible to you'          },
];

// ── Init ─────────────────────────────────────────────────────
export function initCreatePost() {
  modal = document.getElementById('createPostModal');
  if (!modal) {
    console.warn('[create-post] modal not found');
    return;
  }

  editor    = modal.querySelector('[data-cp-editor]');
  mediaGrid = modal.querySelector('[data-cp-media-grid]');
  postBtn   = modal.querySelector('[data-cp-post]');

  // Open triggers on the page
  document.querySelectorAll('[data-open-create-post]').forEach(el =>
    el.addEventListener('click', open));

  wireClose();
  wireUserRow();
  wireEditor();
  wireFormatBar();
  wireAddBar();
  wireAudienceNested();
  wireTagNested();
  wireLocationNested();

  buildColourGrid(
    modal.querySelector('[data-cp-bg-grid]'),
    BG_COLOURS,
    onBgColour
  );

  buildColourGrid(
    modal.querySelector('[data-cp-text-grid]'),
    TEXT_COLOURS,
    onTextColour
  );

  buildEmojiGrid(
    modal.querySelector('[data-cp-emoji-grid]'),
    EMOJIS,
    onEmojiPick
  );

  buildAudienceList();

  // Submit hook
  postBtn.addEventListener('click', submit);

  store.on('session:ready', hydrateUserRow);
  store.on('account:switched', hydrateUserRow);
}

// ── Open / close ─────────────────────────────────────────────
function open() {
  reset();
  hydrateUserRow();
  modal.classList.remove('hidden');
  setTimeout(() => editor.focus(), 100);
}

function close() {
  modal.classList.add('hidden');
  closeAllPopups();
  closeAllNested();
}

function reset() {
  editor.innerHTML = '';
  editor.removeAttribute('style');
  editor.removeAttribute('data-text-size');
  editor.classList.add('show-placeholder');

  files = [];
  taggedUsers = [];
  location = null;
  audience = {
    id: 'connections',
    label: 'Connections',
    icon: 'groups'
  };

  nextFileId = 1;

  renderMedia();
  renderTags();
  renderLocation();
  updateAudienceButton();
  updatePostBtn();
}

function wireClose() {
  modal.querySelectorAll('[data-close-post]').forEach(el =>
    el.addEventListener('click', close));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      close();
    }
  });
}

// ── User row ─────────────────────────────────────────────────
function hydrateUserRow() {
  const me = getUser();
  if (!me) return;

  const name = getAccountDisplayName(me);
  const avatar = getAccountAvatar(me);

  modal.querySelectorAll('[data-me-name]').forEach(el =>
    el.textContent = name
  );

  modal
    .querySelector('[data-cp-editor]')
    .setAttribute(
      'data-placeholder',
      `What's on your mind, ${name.split(' ')[0]}?`
    );

  modal.querySelectorAll('[data-me-avatar]').forEach(el =>
    el.src = avatar
  );
}

function wireUserRow() {
  modal.querySelector('[data-cp-audience-open]')?.addEventListener('click', () => {
    modal
      .querySelector('[data-cp-audience-modal]')
      ?.classList.remove('hidden');
  });
}

// ── Editor ───────────────────────────────────────────────────
function wireEditor() {
  editor.addEventListener('input', () => {
    editor.classList.toggle(
      'show-placeholder',
      !editor.textContent.trim() && !editor.querySelector('img,br')
    );

    updatePostBtn();
  });

  editor.addEventListener('keydown', (e) => {
    // Ctrl/Cmd shortcuts
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      const k = e.key.toLowerCase();

      if (k === 'b') {
        e.preventDefault();
        document.execCommand('bold');
      }

      if (k === 'i') {
        e.preventDefault();
        document.execCommand('italic');
      }

      if (k === 'u') {
        e.preventDefault();
        document.execCommand('underline');
      }
    }

    // Enter creates a <br> in contenteditable
    // Default behaviour is fine
  });
}

function insertTextAtCursor(text) {
  editor.focus();

  const sel = window.getSelection();

  if (!sel.rangeCount) {
    editor.textContent += text;
    return;
  }

  const range = sel.getRangeAt(0);

  range.deleteContents();

  const node = document.createTextNode(text);

  range.insertNode(node);
  range.setStartAfter(node);
  range.setEndAfter(node);

  sel.removeAllRanges();
  sel.addRange(range);

  editor.classList.remove('show-placeholder');

  updatePostBtn();
}

// ── Format bar ───────────────────────────────────────────────
function wireFormatBar() {
  const popups = {
    bg:     modal.querySelector('[data-cp-bg-popup]'),
    text:   modal.querySelector('[data-cp-text-popup]'),
    size:   modal.querySelector('[data-cp-size-popup]'),
    align:  modal.querySelector('[data-cp-align-popup]'),
    emoji:  modal.querySelector('[data-cp-emoji-picker]'),
  };

  const toggle = (key) => {
    Object.entries(popups).forEach(([k, p]) => {
      if (!p) return;

      p.classList.toggle(
        'hidden',
        k !== key
          ? true
          : p.classList.contains('hidden')
            ? false
            : false
      );
    });

    // simpler: open only the one, close others
    Object.entries(popups).forEach(([k, p]) => {
      if (!p) return;

      if (k === key) {
        p.classList.toggle('hidden');
      } else {
        p.classList.add('hidden');
      }
    });
  };

  modal.querySelector('[data-cp-bg-open]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle('bg');
  });

  modal.querySelector('[data-cp-text-open]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle('text');
  });

  modal.querySelector('[data-cp-size-open]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle('size');
  });

  modal.querySelector('[data-cp-align-open]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle('align');
  });

  modal.querySelector('[data-cp-emoji-open]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle('emoji');
  });

  modal.querySelector('[data-cp-bold]')?.addEventListener('click', () =>
    document.execCommand('bold')
  );

  modal.querySelector('[data-cp-italic]')?.addEventListener('click', () =>
    document.execCommand('italic')
  );

  modal.querySelector('[data-cp-underline]')?.addEventListener('click', () =>
    document.execCommand('underline')
  );

  modal.querySelectorAll('[data-cp-size-popup] [data-size]').forEach(btn =>
    btn.addEventListener('click', () => {
      const size = btn.dataset.size;

      editor.setAttribute('data-text-size', size);

      editor.style.fontSize =
        size === 'small'
          ? '16px'
          : size === 'large'
            ? '28px'
            : '22px';

      popups.size.classList.add('hidden');
    })
  );

  modal.querySelectorAll('[data-cp-align-popup] [data-align]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.execCommand(
        `justify${
          btn.dataset.align === 'left'
            ? 'Left'
            : btn.dataset.align === 'center'
              ? 'Center'
              : 'Right'
        }`
      );

      popups.align.classList.add('hidden');
    })
  );

  // Close popups on outside click
  document.addEventListener('click', (e) => {
    if (!modal.contains(e.target)) return;

    Object.values(popups).forEach(p => {
      if (
        p &&
        !p.contains(e.target) &&
        !e.target.closest(
          '[data-cp-bg-open],[data-cp-text-open],[data-cp-size-open],[data-cp-align-open],[data-cp-emoji-open]'
        )
      ) {
        p.classList.add('hidden');
      }
    });
  });
}

function onBgColour(hex) {
  editor.style.background = hex;

  // Ensure text stays readable
  const isDark =
    hex !== '#ffffff' &&
    hex !== '#e4e6eb' &&
    hex !== '#fde047';

  if (!editor.style.color || editor.style.color === '') {
    editor.style.color = isDark ? '#ffffff' : '#1c1e21';
  }

  closeAllPopups();
}

function onTextColour(hex) {
  editor.style.color = hex;
  closeAllPopups();
}

function onEmojiPick(emoji) {
  insertTextAtCursor(emoji);
}

function buildColourGrid(container, colours, onPick) {
  if (!container) return;

  container.innerHTML = colours.map(c =>
    `<button type="button" class="cp-color-swatch" style="background:${c}" data-color="${c}" aria-label="${c}"></button>`
  ).join('');

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-color]');

    if (!btn) return;

    container
      .querySelectorAll('.cp-color-swatch.active')
      .forEach(el => el.classList.remove('active'));

    btn.classList.add('active');

    onPick(btn.dataset.color);
  });
}

function buildEmojiGrid(container, emojis, onPick) {
  if (!container) return;

  container.innerHTML = emojis.map(e =>
    `<button type="button" data-emoji="${e}">${e}</button>`
  ).join('');

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-emoji]');

    if (!btn) return;

    onPick(btn.dataset.emoji);
  });
}

function closeAllPopups() {
  modal
    .querySelectorAll('.cp-popup')
    .forEach(p => p.classList.add('hidden'));
}

// ── Add-to-post bar ──────────────────────────────────────────
function wireAddBar() {
  const fileInput = modal.querySelector('[data-cp-photo-input]');

  modal
    .querySelector('[data-cp-photo-open]')
    ?.addEventListener('click', () => fileInput.click());

  fileInput?.addEventListener('change', (e) =>
    addFiles([...e.target.files])
  );

  modal
    .querySelector('[data-cp-tag-open]')
    ?.addEventListener('click', openTagNested);

  modal
    .querySelector('[data-cp-location-open]')
    ?.addEventListener('click', openLocationNested);
}

function addFiles(newFiles) {
  const remaining = 10 - files.length;

  newFiles.slice(0, remaining).forEach((file) => {
    const url = URL.createObjectURL(file);

    files.push({
      id: nextFileId++,
      file,
      url,
      kind: file.type.startsWith('video/')
        ? 'video'
        : 'image',
    });
  });

  renderMedia();
  updatePostBtn();
}

function renderMedia() {
  mediaGrid.innerHTML = '';
  mediaGrid.dataset.count = String(files.length);

  mediaGrid.classList.toggle(
    'hidden',
    files.length === 0
  );

  files.forEach((f) => {
    const item = document.createElement('div');

    item.className = 'cp-media-item';
    item.dataset.fileId = f.id;

    item.innerHTML =
      f.kind === 'video'
        ? `<video src="${f.url}" muted playsinline></video>`
        : `<img src="${f.url}" alt="">`;

    const remove = document.createElement('button');

    remove.type = 'button';
    remove.className = 'cp-media-remove';
    remove.setAttribute('aria-label', 'Remove');

    remove.innerHTML =
      '<span class="material-symbols-outlined" style="font-size:16px">close</span>';

    remove.addEventListener('click', () => {
      URL.revokeObjectURL(f.url);

      files = files.filter(x => x.id !== f.id);

      renderMedia();
      updatePostBtn();
    });

    item.appendChild(remove);
    mediaGrid.appendChild(item);
  });
}

// ── Tag people ───────────────────────────────────────────────
function openTagNested() {
  renderTagList('');

  modal
    .querySelector('[data-cp-tag-modal]')
    ?.classList.remove('hidden');

  setTimeout(
    () => modal.querySelector('[data-cp-tag-search]')?.focus(),
    50
  );
}

function wireTagNested() {
  const tagModal = modal.querySelector('[data-cp-tag-modal]');

  tagModal
    .querySelector('[data-cp-tag-search]')
    ?.addEventListener('input', (e) =>
      renderTagList(e.target.value)
    );

  tagModal
    .querySelector('[data-cp-tag-close]')
    ?.addEventListener('click', () =>
      tagModal.classList.add('hidden')
    );

  tagModal
    .querySelector('[data-cp-tag-cancel]')
    ?.addEventListener('click', () =>
      tagModal.classList.add('hidden')
    );

  tagModal
    .querySelector('[data-cp-tag-done]')
    ?.addEventListener('click', () => {
      tagModal.classList.add('hidden');
      renderTags();
    });
}

async function renderTagList(query) {
  const list = modal.querySelector('[data-cp-tag-list]');

  list.innerHTML =
    '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">Searching…</div>';

  try {
    const { users = [] } = await api.search(query);

    const filtered = users.filter(
      u => u.account_type !== 'corporate'
    );

    if (!filtered.length) {
      list.innerHTML =
        `<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">No people found.</div>`;

      return;
    }

    list.innerHTML = filtered.map(u => `
      <label class="cp-tag-item">
        <img src="${escAttr(u.profilePic || '/images/profile.jpg')}" alt="">
        <div class="cp-tag-item-info">
          <h4>${escHtml(u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim())}</h4>
          <p>${escHtml(u.headline || u.email || '')}</p>
        </div>
        <input
          type="checkbox"
          data-tag-id="${escAttr(u.id)}"
          ${taggedUsers.some(t => t.id === u.id) ? 'checked' : ''}
        >
      </label>
    `).join('');

    list.querySelectorAll('[data-tag-id]').forEach(cb =>
      cb.addEventListener('change', () => {
        const id = cb.dataset.tagId;
        const item = filtered.find(u => u.id === id);

        if (cb.checked) {
          if (!taggedUsers.some(t => t.id === id)) {
            taggedUsers.push({
              id,
              name:
                item.name ||
                `${item.firstName || ''} ${item.lastName || ''}`.trim(),
              avatar: item.profilePic
            });
          }
        } else {
          taggedUsers = taggedUsers.filter(
            t => t.id !== id
          );
        }
      })
    );

  } catch (e) {
    list.innerHTML =
      `<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">Search failed.</div>`;
  }
}

function renderTags() {
  const wrap = modal.querySelector('[data-cp-people-tags]');

  wrap.innerHTML = '';

  wrap.classList.toggle(
    'hidden',
    taggedUsers.length === 0
  );

  taggedUsers.forEach((t) => {
    const chip = document.createElement('span');

    chip.className = 'cp-person-tag';

    chip.innerHTML = `
      <img src="${escAttr(t.avatar || '/images/profile.jpg')}" alt="">
      ${escHtml(t.name)}
      <button type="button" aria-label="Remove">&times;</button>
    `;

    chip
      .querySelector('button')
      .addEventListener('click', () => {
        taggedUsers = taggedUsers.filter(
          x => x.id !== t.id
        );

        renderTags();
      });

    wrap.appendChild(chip);
  });
}

// ── Location ─────────────────────────────────────────────────
function openLocationNested() {
  const m = modal.querySelector('[data-cp-location-modal]');
  const input = modal.querySelector('[data-cp-location-input]');

  input.value = location || '';

  m.classList.remove('hidden');

  setTimeout(() => input.focus(), 50);
}

function wireLocationNested() {
  const m = modal.querySelector('[data-cp-location-modal]');

  m
    .querySelector('[data-cp-location-close]')
    ?.addEventListener('click', () =>
      m.classList.add('hidden')
    );

  m
    .querySelector('[data-cp-location-cancel]')
    ?.addEventListener('click', () =>
      m.classList.add('hidden')
    );

  m
    .querySelector('[data-cp-location-done]')
    ?.addEventListener('click', () => {
      const val = m
        .querySelector('[data-cp-location-input]')
        .value
        .trim();

      location = val || null;

      m.classList.add('hidden');

      renderLocation();
    });

  m
    .querySelector('[data-cp-location-input]')
    ?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        m.querySelector('[data-cp-location-done]').click();
      }
    });

  modal
    .querySelector('[data-cp-location-remove]')
    ?.addEventListener('click', () => {
      location = null;
      renderLocation();
    });
}

function renderLocation() {
  const wrap = modal.querySelector('[data-cp-location-tag]');

  wrap.classList.toggle('hidden', !location);

  if (location) {
    modal.querySelector('[data-cp-location-text]').textContent =
      location;
  }
}

// ── Audience ─────────────────────────────────────────────────
function buildAudienceList() {
  const list = modal.querySelector(
    '[data-cp-audience-options]'
  );

  if (!list) return;

  list.innerHTML = AUDIENCES.map(a => `
    <button
      type="button"
      class="cp-audience-option ${a.id === audience.id ? 'active' : ''}"
      data-audience-id="${a.id}"
    >
      <div class="cp-audience-option-icon">
        <span class="material-symbols-outlined">${a.icon}</span>
      </div>

      <div class="cp-audience-option-info">
        <h4>${a.label}</h4>
        <p>${a.desc}</p>
      </div>
    </button>
  `).join('');

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-audience-id]');

    if (!btn) return;

    const picked = AUDIENCES.find(
      a => a.id === btn.dataset.audienceId
    );

    audience = picked;

    list
      .querySelectorAll('.cp-audience-option')
      .forEach(el =>
        el.classList.toggle('active', el === btn)
      );

    updateAudienceButton();

    setTimeout(
      () =>
        modal
          .querySelector('[data-cp-audience-modal]')
          .classList.add('hidden'),
      150
    );
  });
}

function wireAudienceNested() {
  const m = modal.querySelector(
    '[data-cp-audience-modal]'
  );

  m
    .querySelector('[data-cp-audience-close]')
    ?.addEventListener('click', () =>
      m.classList.add('hidden')
    );
}

function updateAudienceButton() {
  const icon = modal.querySelector('[data-audience-icon]');
  const label = modal.querySelector('[data-audience-label]');

  if (icon) icon.textContent = audience.icon;
  if (label) label.textContent = audience.label;
}

// ── Submit ───────────────────────────────────────────────────
function updatePostBtn() {
  const hasText =
    !!editor.textContent.trim() ||
    !!editor.innerHTML
      .replace(/<br\s*\/?>/gi, '')
      .trim();

  const hasMedia = files.length > 0;

  postBtn.disabled = !hasText && !hasMedia;
}

async function submit() {
  const textContent = editor.innerHTML.trim();

  if (!textContent && files.length === 0) return;

  postBtn.disabled = true;

  const original = postBtn.textContent;

  postBtn.textContent = 'Posting…';

  const me = getUser();

  const mediaFiles = files.map(f => f.file);

  // Optimistic preview post
  const optimisticPost = {
    id: 'temp-' + Date.now(),
    textContent: stripHtml(textContent),
    textHtml: textContent,
    createdAt: Date.now(),
    mediaUrls: files.map(f => f.url),
    authorName: me
      ? getAccountDisplayName(me)
      : 'You',
    userProfilePic: me
      ? getAccountAvatar(me)
      : '/images/profile.jpg',
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    _pending: true,
  };

  store.emit('post:created', optimisticPost);

  try {
    const res = await api.createPost({
      textContent,
      tags: taggedUsers.map(t => t.id),
      media: mediaFiles,
    });

    // Remove optimistic, insert server-returned post
    store.emit('post:deleted', {
      id: optimisticPost.id
    });

    const post = normalizePost(
      res.post,
      me
    );

    store.emit('post:created', post);

    close();

  } catch (e) {
    console.error('[create-post] failed:', e);

    store.emit('post:deleted', {
      id: optimisticPost.id
    });

    alert(
      e.message ||
      'Could not publish post. Please try again.'
    );

    postBtn.disabled = false;

  } finally {
    postBtn.textContent = original;
  }
}

function normalizePost(raw, me) {
  return {
    id: raw.id,
    textContent: raw.textContent || '',
    textHtml: raw.textContent || '',
    createdAt: raw.createdAt || Date.now(),
    mediaUrls: raw.mediaUrls || [],
    authorName: me
      ? getAccountDisplayName(me)
      : 'You',
    userProfilePic: me
      ? getAccountAvatar(me)
      : '/images/profile.jpg',
    likeCount: raw.likeCount || 0,
    commentCount: raw.commentCount || 0,
    isLiked: false,
  };
}

// ── Helpers ──────────────────────────────────────────────────
function stripHtml(html) {
  const div = document.createElement('div');

  div.innerHTML = html;

  return div.textContent || '';
}

function closeAllNested() {
  modal
    .querySelectorAll('.cp-nested-modal')
    .forEach(m => m.classList.add('hidden'));
}

function escHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
  );
}

const escAttr = escHtml;