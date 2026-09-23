import { api } from '../core/api.js';

// ── Section schemas ──────────────────────────────────────────
const SCHEMAS = {
  header: {
    title: 'Edit headline',
    mode: 'single',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true },
      { name: 'headline', label: 'Professional title', type: 'text' },
      { name: 'tagline',  label: 'Tagline (optional)', type: 'text' },
      { name: 'location', label: 'Location', type: 'text' },
    ],
  },
  about: {
    title: 'Edit About',
    mode: 'single',
    fields: [
      { name: 'bio',       label: 'Brief bio (3–6 sentences)', type: 'textarea' },
      { name: 'expertise', label: 'Areas of expertise',         type: 'textarea' },
    ],
  },
  contact: {
    title: 'Edit Contact & Links',
    mode: 'single',
    fields: [
      { name: 'email',   label: 'Professional email', type: 'email' },
      { name: 'phone',   label: 'Phone',              type: 'tel' },
      { name: 'website', label: 'Personal website',   type: 'url' },
      { name: 'address', label: 'Address / Location', type: 'text' },
    ],
  },
  personalInterests: {
    title: 'Edit Personal Interests',
    mode: 'stringList',
    label: 'Personal interests / hobbies',
    placeholder: 'e.g. Long-distance cycling',
  },
  experience: {
    title: 'Experience',
    mode: 'list',
    itemTitle: (it) => it.title || 'Untitled',
    itemSubtitle: (it) => it.company || '',
    fields: [
      { name: 'title',       label: 'Job title',       type: 'text',  required: true },
      { name: 'company',     label: 'Company',         type: 'text',  required: true },
      { name: 'location',    label: 'Location',        type: 'text' },
      { name: 'startDate',   label: 'Start date',      type: 'month' },
      { name: 'current',     label: 'I currently work here', type: 'checkbox' },
      { name: 'endDate',     label: 'End date',        type: 'month' },
      { name: 'description', label: 'Description',     type: 'textarea' },
      { name: 'tools',       label: 'Tools / platforms', type: 'text', hint: 'Comma-separated' },
    ],
  },
  education: {
    title: 'Education',
    mode: 'list',
    itemTitle: (it) => it.institution || 'Untitled',
    itemSubtitle: (it) => it.degree || '',
    fields: [
      { name: 'institution', label: 'School / Institution', type: 'text', required: true },
      { name: 'degree',      label: 'Degree / Qualification', type: 'text' },
      { name: 'field',       label: 'Field of study',   type: 'text' },
      { name: 'startYear',   label: 'Start year',       type: 'text' },
      { name: 'endYear',     label: 'End year',         type: 'text' },
      { name: 'description', label: 'Description',      type: 'textarea' },
    ],
  },
  licenses: {
    title: 'Licenses & Certifications',
    mode: 'list',
    itemTitle: (it) => it.name || 'Untitled',
    itemSubtitle: (it) => it.issuer || '',
    fields: [
      { name: 'name',           label: 'Certification name', type: 'text', required: true },
      { name: 'issuer',         label: 'Issuing organization', type: 'text' },
      { name: 'issueDate',      label: 'Issue date',        type: 'month' },
      { name: 'expirationDate', label: 'Expiration date',   type: 'month' },
      { name: 'credentialId',   label: 'Credential ID',     type: 'text' },
    ],
  },
  affiliations: {
    title: 'Professional Affiliations',
    mode: 'list',
    itemTitle: (it) => it.organization || 'Untitled',
    itemSubtitle: (it) => it.role || '',
    fields: [
      { name: 'organization', label: 'Organization',   type: 'text', required: true },
      { name: 'role',         label: 'Role / Position', type: 'text' },
      { name: 'startDate',    label: 'Start date',     type: 'month' },
      { name: 'endDate',      label: 'End date',       type: 'month' },
      { name: 'description',  label: 'Description',    type: 'textarea' },
    ],
  },
  volunteer: {
    title: 'Volunteer Work',
    mode: 'list',
    itemTitle: (it) => it.organization || 'Untitled',
    itemSubtitle: (it) => it.role || '',
    fields: [
      { name: 'organization', label: 'Organization',   type: 'text', required: true },
      { name: 'role',         label: 'Role / Position', type: 'text' },
      { name: 'startDate',    label: 'Start date',     type: 'month' },
      { name: 'endDate',      label: 'End date',       type: 'month' },
      { name: 'description',  label: 'Description',    type: 'textarea' },
    ],
  },
  languages: {
    title: 'Languages',
    mode: 'list',
    itemTitle: (it) => it.language || 'Untitled',
    itemSubtitle: (it) => it.proficiency || '',
    fields: [
      { name: 'language',    label: 'Language',    type: 'text', required: true },
      { name: 'proficiency', label: 'Proficiency', type: 'select',
        options: [
          { value: 'native', label: 'Native' },
          { value: 'fluent', label: 'Fluent' },
          { value: 'advanced', label: 'Advanced' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'basic', label: 'Basic' },
        ] },
    ],
  },
  skills: {
    title: 'Skills & Tools',
    mode: 'list',
    itemTitle: (it) => it.name || 'Untitled',
    itemSubtitle: (it) => it.level || '',
    fields: [
      { name: 'name',  label: 'Skill',       type: 'text', required: true },
      { name: 'level', label: 'Proficiency', type: 'select',
        options: [
          { value: 'expert', label: 'Expert' },
          { value: 'advanced', label: 'Advanced' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'beginner', label: 'Beginner' },
        ] },
    ],
  },
  references: {
    title: 'References',
    mode: 'list',
    itemTitle: (it) => it.name || 'Untitled',
    itemSubtitle: (it) => it.designation || '',
    fields: [
      { name: 'name',         label: 'Referee name',   type: 'text', required: true },
      { name: 'designation',  label: 'Designation',    type: 'text' },
      { name: 'organization', label: 'Organization',   type: 'text' },
      { name: 'email',        label: 'Email',          type: 'email' },
      { name: 'phone',        label: 'Phone',          type: 'tel' },
      { name: 'description',  label: 'Description',    type: 'textarea' },
    ],
  },
};

// ── State ────────────────────────────────────────────────────
let modal, titleEl, bodyEl, footerEl, backBtn;
let currentSection, currentSchema, currentProfile, onSaved;
let view = 'list';           // 'list' | 'form'
let editingEntry = null;     // entry object being edited, or null for new

// ── Public API ───────────────────────────────────────────────
export function openSectionEditor(section, profile, onProfileUpdated) {
  modal = document.getElementById('profileEditModal');
  if (!modal) { console.warn('[profile-edit] modal not found'); return; }

  titleEl  = modal.querySelector('[data-pe-title]');
  bodyEl   = modal.querySelector('[data-pe-body]');
  footerEl = modal.querySelector('[data-pe-footer]');
  backBtn  = modal.querySelector('[data-pe-back]');

  currentSection = section;
  currentProfile = profile;
  currentSchema  = SCHEMAS[section];
  onSaved        = onProfileUpdated;

  if (!currentSchema) { console.warn('[profile-edit] unknown section:', section); return; }

  modal.classList.remove('hidden');
  wireStatic();
  view = (currentSchema.mode === 'list') ? 'list' : 'form';
  editingEntry = null;
  renderView();
}

// ── Static wiring (idempotent) ───────────────────────────────
let staticWired = false;
function wireStatic() {
  if (staticWired) return;
  staticWired = true;

  modal.querySelectorAll('[data-pe-close]').forEach(el =>
    el.addEventListener('click', close));
  modal.querySelector('[data-pe-cancel]')?.addEventListener('click', close);
  backBtn?.addEventListener('click', goBack);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });
}

function close() {
  modal.classList.add('hidden');
  bodyEl.innerHTML = '';
  editingEntry = null;
}

function goBack() {
  if (currentSchema.mode === 'list') {
    view = 'list';
    editingEntry = null;
    renderView();
  }
}

// ── Rendering ────────────────────────────────────────────────
function renderView() {
  titleEl.textContent = currentSchema.title;
  footerEl.classList.toggle('hidden', currentSchema.mode === 'stringList' && view === 'list');
  backBtn.classList.toggle('hidden', !(currentSchema.mode === 'list' && view === 'form'));

  if (currentSchema.mode === 'stringList') {
    renderStringList();
    return;
  }
  if (currentSchema.mode === 'single') {
    renderForm(currentProfile[currentSection] || {});
    return;
  }
  // list mode
  if (view === 'list') renderList();
  else renderForm(editingEntry || {});
}

// ── Form rendering ───────────────────────────────────────────
function renderForm(values) {
  bodyEl.innerHTML = currentSchema.fields.map(f => fieldHTML(f, values[f.name])).join('');

  // Auto-hide endDate when 'current' is checked
  const current = bodyEl.querySelector('[name="current"]');
  const endDate = bodyEl.querySelector('[name="endDate"]');
  const syncEndDate = () => { if (endDate) endDate.disabled = !!current?.checked; };
  current?.addEventListener('change', syncEndDate);
  syncEndDate();

  footerEl.innerHTML = `
    <button class="pe-cancel-btn" data-pe-cancel type="button">Cancel</button>
    <button class="pe-save-btn" data-pe-save type="button">Save</button>
  `;
  footerEl.querySelector('[data-pe-cancel]')?.addEventListener('click', () => {
    if (currentSchema.mode === 'list') goBack();
    else close();
  });
  footerEl.querySelector('[data-pe-save]')?.addEventListener('click', submitForm);
}

function fieldHTML(f, value) {
  const id = `pe-f-${f.name}`;
  const base = `id="${id}" name="${f.name}"`;
  const hint = f.hint ? `<div class="pe-field-hint">${escHtml(f.hint)}</div>` : '';

  if (f.type === 'textarea') {
    return `<div class="pe-field">
      <label for="${id}">${escHtml(f.label)}</label>
      <textarea ${base} rows="4">${escHtml(value || '')}</textarea>${hint}
    </div>`;
  }
  if (f.type === 'checkbox') {
    return `<div class="pe-field pe-field-checkbox">
      <label><input type="checkbox" ${base} ${value ? 'checked' : ''}> ${escHtml(f.label)}</label>
    </div>`;
  }
  if (f.type === 'select') {
    const opts = (f.options || []).map(o =>
      `<option value="${escAttr(o.value)}" ${value === o.value ? 'selected' : ''}>${escHtml(o.label)}</option>`
    ).join('');
    return `<div class="pe-field">
      <label for="${id}">${escHtml(f.label)}</label>
      <select ${base}>${opts}</select>${hint}
    </div>`;
  }
  return `<div class="pe-field">
    <label for="${id}">${escHtml(f.label)}</label>
    <input type="${f.type || 'text'}" ${base} value="${escAttr(value || '')}">${hint}
  </div>`;
}

function readForm() {
  const data = {};
  currentSchema.fields.forEach(f => {
    const el = bodyEl.querySelector(`[name="${f.name}"]`);
    if (!el) return;
    if (f.type === 'checkbox') data[f.name] = el.checked;
    else if (f.type === 'number') data[f.name] = el.value === '' ? '' : Number(el.value);
    else data[f.name] = el.value.trim();
  });
  // Convert comma-separated fields to arrays
  if (typeof data.tools === 'string') {
    data.tools = data.tools.split(',').map(s => s.trim()).filter(Boolean);
  }
  return data;
}

async function submitForm() {
  const data = readForm();
  // Simple required validation
  const missing = currentSchema.fields.find(f => f.required && !data[f.name]);
  if (missing) {
    alert(`${missing.label} is required`);
    return;
  }

  const saveBtn = footerEl.querySelector('[data-pe-save]');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  try {
    if (currentSchema.mode === 'single') {
      await api.updateProfileSection(currentSection, data);
      currentProfile[currentSection] = { ...(currentProfile[currentSection] || {}), ...data };
    } else {
      const entryId = editingEntry?.id;
      const res = await api.saveProfileEntry(currentSection, entryId, data);
      if (entryId) {
        const idx = currentProfile[currentSection].findIndex(e => e.id === entryId);
        if (idx >= 0) currentProfile[currentSection][idx] = res.entry;
      } else {
        currentProfile[currentSection] = [res.entry, ...(currentProfile[currentSection] || [])];
      }
      view = 'list';
      editingEntry = null;
    }
    if (onSaved) onSaved(currentProfile);
    close();
  } catch (e) {
    console.error('[profile-edit] save failed:', e);
    alert(e.message || 'Could not save.');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
  }
}

// ── List view ────────────────────────────────────────────────
function renderList() {
  const items = currentProfile[currentSection] || [];
  footerEl.classList.add('hidden');

  bodyEl.innerHTML = `
    <button class="pe-add-btn" data-pe-add type="button">
      <span class="material-symbols-outlined">add</span>Add new
    </button>
    ${items.length
      ? `<div class="pe-list">${items.map(itemHTML).join('')}</div>`
      : `<p class="pe-empty">Nothing here yet.</p>`}
  `;

  bodyEl.querySelector('[data-pe-add]')?.addEventListener('click', () => {
    editingEntry = null;
    view = 'form';
    renderView();
  });

  bodyEl.querySelectorAll('[data-pe-item-edit]').forEach(btn =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.peItemEdit;
      editingEntry = items.find(e => e.id === id) || {};
      view = 'form';
      renderView();
    }));

  bodyEl.querySelectorAll('[data-pe-item-delete]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.peItemDelete;
      if (!confirm('Delete this entry?')) return;
      try {
        await api.deleteProfileEntry(currentSection, id);
        currentProfile[currentSection] = currentProfile[currentSection].filter(e => e.id !== id);
        if (onSaved) onSaved(currentProfile);
        renderView();
      } catch (e) { alert(e.message || 'Delete failed'); }
    }));
}

function itemHTML(item) {
  const title    = currentSchema.itemTitle?.(item)    || 'Untitled';
  const subtitle = currentSchema.itemSubtitle?.(item) || '';
  return `
    <div class="pe-item">
      <div class="pe-item-info">
        <strong>${escHtml(title)}</strong>
        ${subtitle ? `<span>${escHtml(subtitle)}</span>` : ''}
      </div>
      <div class="pe-item-actions">
        <button class="pe-icon-btn" data-pe-item-edit="${escAttr(item.id)}" title="Edit" type="button">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="pe-icon-btn pe-icon-danger" data-pe-item-delete="${escAttr(item.id)}" title="Delete" type="button">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  `;
}

// ── String list (personalInterests) ──────────────────────────
function renderStringList() {
  const items = currentProfile[currentSection] || [];
  footerEl.classList.remove('hidden');

  bodyEl.innerHTML = `
    <div class="pe-field">
      <label>${escHtml(currentSchema.label || '')}</label>
      <div class="pe-string-list">
        ${items.map((s, i) => `
          <div class="pe-string-row">
            <input type="text" value="${escAttr(s)}" data-pe-string-idx="${i}">
            <button class="pe-icon-btn pe-icon-danger" type="button" data-pe-string-del="${i}">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        `).join('')}
      </div>
      <button class="pe-add-btn" data-pe-string-add type="button">
        <span class="material-symbols-outlined">add</span>Add another
      </button>
    </div>
  `;

  bodyEl.querySelector('[data-pe-string-add]')?.addEventListener('click', () => {
    items.push('');
    renderStringList();
  });
  bodyEl.querySelectorAll('[data-pe-string-del]').forEach(btn =>
    btn.addEventListener('click', () => {
      items.splice(Number(btn.dataset.peStringDel), 1);
      renderStringList();
    }));

  footerEl.innerHTML = `
    <button class="pe-cancel-btn" data-pe-cancel type="button">Cancel</button>
    <button class="pe-save-btn" data-pe-save type="button">Save</button>
  `;
  footerEl.querySelector('[data-pe-cancel]')?.addEventListener('click', close);
  footerEl.querySelector('[data-pe-save]')?.addEventListener('click', async () => {
    const values = [...bodyEl.querySelectorAll('[data-pe-string-idx]')]
      .map(el => el.value.trim()).filter(Boolean);
    try {
      await api.updateProfileSection(currentSection, { [currentSection]: values });
      // Mock stores the raw object — normalize:
      currentProfile[currentSection] = values;
      if (onSaved) onSaved(currentProfile);
      close();
    } catch (e) { alert(e.message || 'Save failed'); }
  });
}

// ── Utilities ────────────────────────────────────────────────
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const escAttr = escHtml;