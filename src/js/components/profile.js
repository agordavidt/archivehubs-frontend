import { api }         from '../core/api.js';
import { store }       from '../core/store.js';
import { getUser }     from '../core/session.js';
import { openSectionEditor } from './profile-edit.js';

let root, mainEl, sidebarEl, profile;
let ownerView = false;
let activityTab = 'posts';

// ── Init ─────────────────────────────────────────────────────
export async function initProfile() {
  root = document.querySelector('[data-profile-page]');
  if (!root) { console.warn('[profile] root not found'); return; }
  mainEl    = root.querySelector('[data-profile-main]');
  sidebarEl = root.querySelector('[data-profile-sidebar]');

  const params   = new URLSearchParams(window.location.search);
  const targetId = params.get('id') || null;

  mainEl.innerHTML = `<div class="pf-loading"><div class="spinner"></div></div>`;

  try {
    const res = await api.getIndividualProfile(targetId);
    profile   = res.profile;
    ownerView = !!profile.header?.isOwner;
  } catch (e) {
    mainEl.innerHTML = `<div class="pf-error">Could not load this profile.</div>`;
    console.error('[profile] load failed:', e);
    return;
  }

  document.title = `${profile.header.fullName} | ArchiveHubs`;
  render();
  wireAfterRender();
}

// ── Render ───────────────────────────────────────────────────
function render() {
  mainEl.innerHTML    = renderMain();
  sidebarEl.innerHTML = renderSidebar();
}

function renderMain() {
  return [
    headerCard(),
    ownerView ? analyticsCard() : '',
    aboutCard(),
    activityCard(),
    listCard('experience', 'Experience', renderExperienceEntry),
    listCard('education', 'Education', renderEducationEntry),
    listCard('licenses', 'Licenses & Certifications', renderLicenseEntry),
    listCard('affiliations', 'Professional Affiliations', renderAffiliationEntry),
    listCard('volunteer', 'Volunteer Work', renderVolunteerEntry),
    listCard('languages', 'Languages', renderLanguageEntry),
    listCard('skills', 'Skills & Tools', renderSkillEntry),
    interestsCard(),
    contactCard(),
    listCard('references', 'References', renderReferenceEntry),
  ].filter(Boolean).join('');
}

function headerCard() {
  const h = profile.header || {};
  const conn = h.connectionCount || 0;
  return `
    <section class="pf-card pf-header">
      <div class="pf-banner">
        <img src="${escAttr(h.banner || '/images/hubs.jpg')}" alt="" data-pf-banner-img>
        ${ownerView ? `
          <button class="pf-media-btn" data-pf-banner-edit title="Change cover" type="button">
            <span class="material-symbols-outlined">photo_camera</span>
          </button>
          <input type="file" data-pf-banner-input accept="image/*" hidden>
        ` : ''}
      </div>

      <div class="pf-header-body">
        <div class="pf-avatar-wrap">
          <img src="${escAttr(h.profilePic || '/images/profile.jpg')}" alt="" class="pf-avatar" data-pf-avatar-img>
          ${ownerView ? `
            <button class="pf-media-btn pf-avatar-edit" data-pf-avatar-edit title="Change photo" type="button">
              <span class="material-symbols-outlined">photo_camera</span>
            </button>
            <input type="file" data-pf-avatar-input accept="image/*" hidden>
          ` : ''}
        </div>

        <div class="pf-header-info">
          <h1 class="pf-name" data-pf-name>${escHtml(h.fullName)}</h1>
          <p class="pf-headline" data-pf-headline>${escHtml(h.headline || '')}</p>
          <p class="pf-meta">
            ${h.location ? `<span><span class="material-symbols-outlined">location_on</span>${escHtml(h.location)}</span>` : ''}
            ${ownerView ? `· <a href="#" data-pf-contact-open>Contact info</a>` : ''}
          </p>
          <p class="pf-connections">${conn.toLocaleString()} connections</p>
        </div>
      </div>

      <div class="pf-header-actions">${ownerView ? ownerActions() : visitorActions(h.connectionStatus)}</div>
    </section>
  `;
}

function ownerActions() {
  return `
    <button class="pf-btn pf-btn-primary" data-open-create-post type="button">
      <span class="material-symbols-outlined">add</span>Add section
    </button>
    <button class="pf-btn" data-pe-open="header" type="button">Edit headline</button>
    <button class="pf-btn" type="button">Enhance profile</button>
  `;
}

function visitorActions(status) {
  if (status === 'self') return '';
  if (status === 'connected') {
    return `
      <button class="pf-btn pf-btn-primary" data-pf-message type="button">Message</button>
      <button class="pf-btn" data-pf-connect type="button" disabled>Connected ✓</button>
      <button class="pf-btn" type="button">More</button>
    `;
  }
  if (status === 'pending') {
    return `<button class="pf-btn" disabled type="button">Request pending</button>`;
  }
  if (status === 'incoming') {
    return `
      <button class="pf-btn pf-btn-primary" data-pf-accept type="button">Accept</button>
      <button class="pf-btn" data-pf-reject type="button">Ignore</button>
    `;
  }
  return `
    <button class="pf-btn pf-btn-primary" data-pf-connect type="button">
      <span class="material-symbols-outlined">person_add</span>Connect
    </button>
    <button class="pf-btn" data-pf-message type="button">Message</button>
    <button class="pf-btn" type="button">More</button>
  `;
}

function analyticsCard() {
  return `
    <section class="pf-card pf-analytics" data-owner-only>
      <header class="pf-section-header">
        <h2>Analytics</h2>
        <span class="pf-private"><span class="material-symbols-outlined">visibility</span> Private to you</span>
      </header>
      <div class="pf-analytics-grid">
        <div class="pf-analytic">
          <span class="material-symbols-outlined">group</span>
          <strong>42</strong>
          <p>Profile views</p>
        </div>
        <div class="pf-analytic">
          <span class="material-symbols-outlined">trending_up</span>
          <strong>1,208</strong>
          <p>Post impressions</p>
        </div>
        <div class="pf-analytic">
          <span class="material-symbols-outlined">search</span>
          <strong>17</strong>
          <p>Search appearances</p>
        </div>
      </div>
    </section>
  `;
}

function aboutCard() {
  const { bio, expertise } = profile.about || {};
  if (!bio && !expertise) return ownerView ? emptyCard('about', 'About', 'Add a short bio to introduce yourself.') : '';
  return `
    <section class="pf-card" data-section="about">
      <header class="pf-section-header">
        <h2>About</h2>
        ${ownerView ? editBtn('about') : ''}
      </header>
      <div class="pf-section-body">
        ${bio ? `<p class="pf-bio">${escHtml(bio)}</p>` : ''}
        ${expertise ? `<p class="pf-expertise"><strong>Expertise · </strong>${escHtml(expertise)}</p>` : ''}
      </div>
    </section>
  `;
}

function activityCard() {
  const empty = `<p class="pf-empty">No activity yet.</p>`;
  return `
    <section class="pf-card" data-section="activity">
      <header class="pf-section-header">
        <h2>Activity</h2>
        ${ownerView ? `<button class="pf-text-btn" data-open-create-post type="button">Create a post</button>` : ''}
      </header>
      <div class="pf-tabs">
        <button class="pf-tab ${activityTab === 'posts' ? 'active' : ''}" data-pf-activity="posts" type="button">Posts</button>
        <button class="pf-tab ${activityTab === 'comments' ? 'active' : ''}" data-pf-activity="comments" type="button">Comments</button>
      </div>
      <div class="pf-activity-body" data-pf-activity-body>${empty}</div>
    </section>
  `;
}

function listCard(sectionKey, title, renderer) {
  const items = profile[sectionKey] || [];
  if (!items.length && !ownerView) return '';
  return `
    <section class="pf-card" data-section="${sectionKey}">
      <header class="pf-section-header">
        <h2>${title}</h2>
        ${ownerView ? editBtn(sectionKey) : ''}
      </header>
      <div class="pf-section-body">
        ${items.length
          ? items.map(renderer).join('')
          : `<p class="pf-empty">${ownerView ? 'Nothing yet — click edit to add.' : ''}</p>`}
      </div>
    </section>
  `;
}

function interestsCard() {
  const items = profile.personalInterests || [];
  if (!items.length && !ownerView) return '';
  return `
    <section class="pf-card" data-section="personalInterests">
      <header class="pf-section-header">
        <h2>Personal Interests</h2>
        ${ownerView ? editBtn('personalInterests') : ''}
      </header>
      <div class="pf-section-body">
        ${items.length
          ? `<ul class="pf-chips">${items.map(s => `<li class="pf-chip">${escHtml(s)}</li>`).join('')}</ul>`
          : `<p class="pf-empty">Share a hobby or interest.</p>`}
      </div>
    </section>
  `;
}

function contactCard() {
  const c = profile.contact || {};
  const hasAny = c.email || c.phone || c.website || c.address;
  if (!hasAny && !ownerView) return '';
  return `
    <section class="pf-card" data-section="contact">
      <header class="pf-section-header">
        <h2>Contact & Links</h2>
        ${ownerView ? editBtn('contact') : ''}
      </header>
      <div class="pf-section-body">
        ${hasAny ? `
          <ul class="pf-contact-list">
            ${c.email   ? `<li><span class="material-symbols-outlined">mail</span><a href="mailto:${escAttr(c.email)}">${escHtml(c.email)}</a></li>` : ''}
            ${c.phone   ? `<li><span class="material-symbols-outlined">call</span>${escHtml(c.phone)}</li>` : ''}
            ${c.website ? `<li><span class="material-symbols-outlined">public</span><a href="${escAttr(c.website)}" target="_blank" rel="noopener">${escHtml(c.website)}</a></li>` : ''}
            ${c.address ? `<li><span class="material-symbols-outlined">home</span>${escHtml(c.address)}</li>` : ''}
          </ul>
        ` : `<p class="pf-empty">Add your contact info.</p>`}
      </div>
    </section>
  `;
}

function emptyCard(sectionKey, title, hint) {
  return `
    <section class="pf-card" data-section="${sectionKey}">
      <header class="pf-section-header">
        <h2>${title}</h2>
        ${ownerView ? editBtn(sectionKey) : ''}
      </header>
      <div class="pf-section-body"><p class="pf-empty">${hint}</p></div>
    </section>
  `;
}

function editBtn(section) {
  return `<button class="pf-icon-btn" data-pe-open="${section}" type="button" title="Edit">
    <span class="material-symbols-outlined">edit</span>
  </button>`;
}

// ── Sidebar ──────────────────────────────────────────────────
function renderSidebar() {
  const parts = [];
  if (ownerView) {
    parts.push(`
      <section class="pf-card pf-sidebar-card">
        <h3>Profile language</h3>
        <p>English</p>
      </section>
      <section class="pf-card pf-sidebar-card">
        <h3>Public profile & URL</h3>
        <a href="#">archivehubs.com/in/${escAttr(profile.id)}</a>
      </section>
    `);
  }
  parts.push(`<div data-include="/components/sidebars/network.html"></div>`);
  parts.push(`
    <section class="pf-card pf-sidebar-card pf-promo">
      <h3>Grow with ArchiveHubs Ads</h3>
      <p>A platform built for B2B.</p>
      <button class="pf-btn pf-btn-primary" type="button">Start now</button>
    </section>
  `);
  return parts.join('');
}

// ── List entry renderers ─────────────────────────────────────
function renderExperienceEntry(e) {
  return `
    <article class="pf-entry">
      <img src="${escAttr(e.companyLogo || '/images/Logo.jpg')}" alt="" class="pf-entry-logo">
      <div class="pf-entry-body">
        <h3>${escHtml(e.title || '')}</h3>
        <p class="pf-entry-org">${escHtml(e.company || '')}${e.location ? ` · ${escHtml(e.location)}` : ''}</p>
        <p class="pf-entry-time">${dateRange(e.startDate, e.current ? '' : e.endDate, e.current)}</p>
        ${e.description ? `<p class="pf-entry-desc">${escHtml(e.description)}</p>` : ''}
        ${Array.isArray(e.tools) && e.tools.length
          ? `<p class="pf-entry-tools"><strong>Tools · </strong>${escHtml(e.tools.join(', '))}</p>` : ''}
      </div>
    </article>
  `;
}

function renderEducationEntry(e) {
  return `
    <article class="pf-entry">
      <img src="${escAttr(e.logo || '/images/Logo.jpg')}" alt="" class="pf-entry-logo">
      <div class="pf-entry-body">
        <h3>${escHtml(e.institution || '')}</h3>
        <p class="pf-entry-org">${escHtml(e.degree || '')}${e.field ? `, ${escHtml(e.field)}` : ''}</p>
        <p class="pf-entry-time">${escHtml(e.startYear || '')}${e.endYear ? ` – ${escHtml(e.endYear)}` : ''}</p>
        ${e.description ? `<p class="pf-entry-desc">${escHtml(e.description)}</p>` : ''}
      </div>
    </article>
  `;
}

function renderLicenseEntry(e) {
  return `
    <article class="pf-entry">
      <img src="${escAttr(e.logo || '/images/Logo.jpg')}" alt="" class="pf-entry-logo">
      <div class="pf-entry-body">
        <h3>${escHtml(e.name || '')}</h3>
        <p class="pf-entry-org">${escHtml(e.issuer || '')}</p>
        <p class="pf-entry-time">${monthYear(e.issueDate)}${e.expirationDate ? ` – ${monthYear(e.expirationDate)}` : ''}</p>
        ${e.credentialId ? `<p class="pf-entry-meta">Credential · ${escHtml(e.credentialId)}</p>` : ''}
      </div>
    </article>
  `;
}

function renderAffiliationEntry(e) {
  return `
    <article class="pf-entry">
      <div class="pf-entry-body">
        <h3>${escHtml(e.organization || '')}</h3>
        <p class="pf-entry-org">${escHtml(e.role || '')}</p>
        <p class="pf-entry-time">${dateRange(e.startDate, e.endDate, !e.endDate)}</p>
        ${e.description ? `<p class="pf-entry-desc">${escHtml(e.description)}</p>` : ''}
      </div>
    </article>
  `;
}

function renderVolunteerEntry(e) {
  return `
    <article class="pf-entry">
      <div class="pf-entry-body">
        <h3>${escHtml(e.role || '')}</h3>
        <p class="pf-entry-org">${escHtml(e.organization || '')}</p>
        <p class="pf-entry-time">${dateRange(e.startDate, e.endDate, !e.endDate)}</p>
        ${e.description ? `<p class="pf-entry-desc">${escHtml(e.description)}</p>` : ''}
      </div>
    </article>
  `;
}

function renderLanguageEntry(e) {
  return `<article class="pf-inline-entry">
    <strong>${escHtml(e.language || '')}</strong>
    <span class="pf-proficiency">${escHtml(titleCase(e.proficiency || ''))}</span>
  </article>`;
}

function renderSkillEntry(e) {
  return `<article class="pf-inline-entry">
    <strong>${escHtml(e.name || '')}</strong>
    ${e.level ? `<span class="pf-proficiency">${escHtml(titleCase(e.level))}</span>` : ''}
  </article>`;
}

function renderReferenceEntry(e) {
  return `
    <article class="pf-entry">
      <div class="pf-entry-body">
        <h3>${escHtml(e.name || '')}</h3>
        <p class="pf-entry-org">${escHtml(e.designation || '')}${e.organization ? ` · ${escHtml(e.organization)}` : ''}</p>
        ${e.description ? `<p class="pf-entry-desc">${escHtml(e.description)}</p>` : ''}
      </div>
    </article>
  `;
}

// ── Wiring ───────────────────────────────────────────────────
function wireAfterRender() {
  // Edit buttons (delegated via data-pe-open)
  mainEl.querySelectorAll('[data-pe-open]').forEach(btn =>
    btn.addEventListener('click', () => {
      const section = btn.dataset.peOpen;
      openSectionEditor(section, profile, async (updatedProfile) => {
        profile = updatedProfile;
        render();
        wireAfterRender();
      });
    }));

  // Banner upload
  const bannerBtn = mainEl.querySelector('[data-pf-banner-edit]');
  const bannerInput = mainEl.querySelector('[data-pf-banner-input]');
  bannerBtn?.addEventListener('click', () => bannerInput.click());
  bannerInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadProfileMedia('banner', file);
      profile.header.banner = res.url;
      mainEl.querySelector('[data-pf-banner-img]').src = res.url;
    } catch (err) { alert('Upload failed'); }
  });

  // Avatar upload
  const avatarBtn = mainEl.querySelector('[data-pf-avatar-edit]');
  const avatarInput = mainEl.querySelector('[data-pf-avatar-input]');
  avatarBtn?.addEventListener('click', () => avatarInput.click());
  avatarInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadProfileMedia('avatar', file);
      profile.header.profilePic = res.url;
      mainEl.querySelector('[data-pf-avatar-img]').src = res.url;
      store.emit('profile:updated', { profile });
    } catch (err) { alert('Upload failed'); }
  });

  // Activity tabs
  mainEl.querySelectorAll('[data-pf-activity]').forEach(btn =>
    btn.addEventListener('click', () => {
      activityTab = btn.dataset.pfActivity;
      mainEl.querySelectorAll('[data-pf-activity]').forEach(b =>
        b.classList.toggle('active', b === btn));
    }));

  // Visitor actions
  mainEl.querySelector('[data-pf-connect]')?.addEventListener('click', async () => {
    try {
      await api.sendConnectionRequest(profile.id);
      profile.header.connectionStatus = 'pending';
      store.emit('connection:requested', { userId: profile.id });
      render(); wireAfterRender();
    } catch (e) { alert(e.message || 'Failed'); }
  });
  mainEl.querySelector('[data-pf-accept]')?.addEventListener('click', async () => {
    try {
      await api.acceptConnectionRequest(profile.id);
      profile.header.connectionStatus = 'connected';
      store.emit('connection:accepted', { userId: profile.id });
      render(); wireAfterRender();
    } catch (e) { alert(e.message || 'Failed'); }
  });
  mainEl.querySelector('[data-pf-reject]')?.addEventListener('click', async () => {
    try {
      await api.rejectConnectionRequest(profile.id);
      profile.header.connectionStatus = 'none';
      store.emit('connection:rejected', { userId: profile.id });
      render(); wireAfterRender();
    } catch (e) { alert(e.message || 'Failed'); }
  });
  mainEl.querySelector('[data-pf-message]')?.addEventListener('click', () => {
    store.emit('message:openWith', { userId: profile.id });
    window.location.href = `/pages/messages.html?conv=&user=${encodeURIComponent(profile.id)}`;
  });

  // Sidebar network include (re-runs after every render)
  import('../core/include.js').then(({ mountPartials }) => mountPartials(sidebarEl));
}

// ── Utilities ────────────────────────────────────────────────
function dateRange(start, end, current) {
  const s = monthYear(start);
  if (current) return `${s} – Present`;
  const e = monthYear(end);
  return s && e ? `${s} – ${e}` : (s || e || '');
}

function monthYear(m) {
  if (!m) return '';
  const [y, mo] = String(m).split('-');
  if (!y) return '';
  if (!mo) return y;
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function titleCase(s) {
  return String(s).replace(/\b\w/g, c => c.toUpperCase());
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const escAttr = escHtml;