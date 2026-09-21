import { api } from '../core/api.js';
import { setPendingProfile } from '../core/session.js';

let accountType = null;

// Expose ALL handlers on window so the existing inline onclick= markup works
Object.assign(window, {
  selectType, goBack, goToIndStep1, goToCorpStep1,
  indNext, corpNext, submitIndividual, submitCorporate,
  updateIndFields, toggleOther, updateCorpType, toggleReg,
  togglePassword,
});

// ── Config (kept from your original) ───────────────────────
const professionalConfig = {
  student: {
    bgLabel: 'Student Background',
    bg: [{v:'basic-education',l:'Basic Education'},{v:'secondary-education',l:'Secondary Education'},
         {v:'tertiary-education',l:'Tertiary Education'},{v:'others',l:'Others'}],
    intLabel: 'Interest',
    int: [{v:'arts',l:'Arts'},{v:'sciences',l:'Sciences'},{v:'social-sciences',l:'Social Sciences'},
          {v:'engineering',l:'Engineering'},{v:'others',l:'Others'}],
  },
  unemployed: {
    bgLabel: 'Unemployment Background',
    bg: [{v:'able-willing',l:'Able and willing to work'},{v:'disabled-willing',l:'Disabled but willing to work'},
         {v:'disabled-cannot',l:'Disabled and cannot work'},{v:'others',l:'Others'}],
    intLabel: 'Interest',
    int: [{v:'job-career',l:'Job (Career Development)'},{v:'skill-building',l:'Skill Building'},
          {v:'business-entrepreneurship',l:'Business / Entrepreneurship'},
          {v:'marketing-sales',l:'Marketing / Sales'},{v:'education-training',l:'Education and Training'},
          {v:'personal-development',l:'Personal Development'},{v:'digital-literacy',l:'Digital Literacy'},
          {v:'internships',l:'Internships or Apprenticeships'},{v:'others',l:'Others'}],
  },
  employed: {
    bgLabel: 'Employment Background',
    bg: [{v:'professional-white',l:'Professional/White-Collar Jobs'},
         {v:'skilled-trades',l:'Skilled Trades/Blue-Collar Jobs'},
         {v:'service-industry',l:'Service Industry Jobs'},{v:'manual-labor',l:'Manual Labor Jobs'},
         {v:'tech-it',l:'Technology & IT Jobs'},{v:'sales-marketing',l:'Sales & Marketing Jobs'},
         {v:'education-training',l:'Education & Training Jobs'},{v:'creative',l:'Creative Jobs'},
         {v:'transport-logistics',l:'Transport & Logistics Jobs'},
         {v:'science-research',l:'Science & Research Jobs'},
         {v:'public-service',l:'Public Service & Security Jobs'},{v:'healthcare',l:'Healthcare Jobs'},
         {v:'others',l:'Others'}],
    intLabel: 'Interest',
    int: [{v:'career-advancement',l:'Career Advancement'},{v:'skill-enhancement',l:'Skill Enhancement'},
          {v:'work-life-balance',l:'Work-Life Balance'},{v:'financial-growth',l:'Financial Growth'},
          {v:'entrepreneurship',l:'Entrepreneurship'},{v:'networking',l:'Networking & Mentorship'},
          {v:'education',l:'Education'},{v:'personal-development',l:'Personal Development'},
          {v:'others',l:'Others'}],
  },
  'self-employed': {
    bgLabel: 'Self-Employed Background',
    bg: [{v:'skilled-trades',l:'Skilled Trades & Services'},
         {v:'freelancing',l:'Freelancing & Remote Work'},{v:'retail-sales',l:'Retail & Sales'},
         {v:'agriculture',l:'Agriculture & Farming'},{v:'crafts',l:'Crafts & Production'},
         {v:'consulting',l:'Consulting & Training'},{v:'transport',l:'Transport & Logistics'},
         {v:'food-hospitality',l:'Food & Hospitality'},{v:'real-estate',l:'Real Estate & Property'},
         {v:'digital',l:'Digital & Online Businesses'},{v:'others',l:'Others'}],
    intLabel: 'Interest',
    int: [{v:'business-growth',l:'Business Growth & Scaling'},
          {v:'financial-management',l:'Financial Management'},{v:'skill-development',l:'Skill Development'},
          {v:'legal-compliance',l:'Legal & Regulatory Compliance'},{v:'tech-tools',l:'Technology & Tools'},
          {v:'marketing-branding',l:'Marketing & Branding'},{v:'networking',l:'Networking & Partnerships'},
          {v:'work-life',l:'Work-Life Balance & Self-Care'},{v:'innovation',l:'Innovation & Trend Awareness'},
          {v:'others',l:'Others'}],
  },
};

// ── Utilities ─────────────────────────────────────────────
function showToast(m, isError) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = m;
  t.classList.toggle('error', !!isError);
  t.classList.add('show');
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => t.classList.remove('show'), 3800);
}
function togglePassword(id, icon) {
  const i = document.getElementById(id);
  const show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  icon.classList.toggle('fa-eye', !show);
  icon.classList.toggle('fa-eye-slash', show);
}
function toggleOther(sel, otherId) {
  const o = document.getElementById(otherId);
  if (!o) return;
  const isOther = sel.value === 'others';
  o.classList.toggle('hidden', !isOther);
  if (!isOther) o.value = '';
}
function goTo(id) {
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function setHint(id, msg, state) {
  const el = document.querySelector(`.field-hint[data-for="${id}"]`);
  if (!el) return;
  el.textContent = msg || '';
  el.classList.remove('error', 'ok');
  if (state) el.classList.add(state);
}
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone = (v) => /^\d{10,11}$/.test(v.replace(/[\s-]/g, ''));
const toE164  = (code, raw) =>
  `${code}${raw.replace(/[\s-]/g, '').replace(/^0+/, '')}`;

// ── Navigation ────────────────────────────────────────────
function selectType(type) {
  accountType = type;
  document.querySelectorAll('.auth-option').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-type="${type}"]`)?.classList.add('selected');
  setTimeout(() => {
    if (type === 'individual') { goTo('ind-step1'); updateProgress(1, 2, 'Personal Details'); }
    else                       { goTo('corp-step1'); updateProgress(1, 2, 'Corporate Details'); }
  }, 150);
}
function goBack() {
  accountType = null;
  document.getElementById('progressWrap').classList.add('hidden');
  goTo('step-choose');
}
function goToIndStep1()  { goTo('ind-step1');  updateProgress(1, 2, 'Personal Details'); }
function goToCorpStep1() { goTo('corp-step1'); updateProgress(1, 2, 'Corporate Details'); }

function updateProgress(step, total, name) {
  document.getElementById('progressWrap').classList.remove('hidden');
  document.getElementById('stepLabel').textContent = `Step ${step} of ${total}`;
  document.getElementById('stepName').textContent = name;
  document.getElementById('progressBar').style.width = `${(step / total) * 100}%`;
  document.querySelectorAll('.auth-step-dot').forEach(d => {
    const s = +d.dataset.step;
    d.classList.remove('active', 'done');
    if (s < step)       { d.classList.add('done'); d.innerHTML = '<i class="fas fa-check" style="font-size:9px"></i>'; }
    else if (s === step){ d.classList.add('active'); d.textContent = s; }
    else                { d.textContent = s; }
  });
}
function setSpin(btnId, spinId, on) {
  document.getElementById(btnId).disabled = on;
  document.getElementById(spinId).classList.toggle('hidden', !on);
}

// ── Individual flow ───────────────────────────────────────
function validateIndStep1(silent) {
  const err = document.getElementById('ind-err1');
  if (!silent) err.textContent = '';
  const first = document.getElementById('ind-firstName').value.trim();
  const sur   = document.getElementById('ind-surName').value.trim();
  const email = document.getElementById('ind-email').value.trim();
  const pass  = document.getElementById('ind-password').value;
  const conf  = document.getElementById('ind-confirmPassword').value;
  const phone = document.getElementById('ind-phone').value.trim();
  const sex   = document.getElementById('ind-sex').value;
  const country = document.getElementById('ind-country').value;
  const state = document.getElementById('ind-state').value;
  const code  = document.getElementById('ind-countryCode').value;

  let firstError = '';
  if (!first) { setHint('ind-firstName', 'First name is required.', 'error'); firstError ||= 'First name is required.'; }
  else setHint('ind-firstName', '');
  if (!sur)   { setHint('ind-surName', 'Surname is required.', 'error'); firstError ||= 'Surname is required.'; }
  else setHint('ind-surName', '');

  if (!email) { setHint('ind-email', 'Email is required.', 'error'); firstError ||= 'Email is required.'; }
  else if (!isEmail(email)) { setHint('ind-email', 'Enter a valid email address.', 'error'); firstError ||= 'Enter a valid email address.'; }
  else setHint('ind-email', 'We’ll send a verification link to this address.');

  if (!pass) { setHint('ind-password', 'Password is required.', 'error'); firstError ||= 'Password is required.'; }
  else if (pass.length < 8) { setHint('ind-password', 'Minimum 8 characters.', 'error'); firstError ||= 'Password must be at least 8 characters.'; }
  else setHint('ind-password', 'Looks good.', 'ok');

  if (!conf) { setHint('ind-confirmPassword', 'Please confirm your password.', 'error'); firstError ||= 'Please confirm your password.'; }
  else if (conf !== pass) { setHint('ind-confirmPassword', 'Passwords do not match.', 'error'); firstError ||= 'Passwords do not match.'; }
  else setHint('ind-confirmPassword', 'Passwords match.', 'ok');

  if (!phone) { setHint('ind-phone', 'Phone number is required.', 'error'); firstError ||= 'Phone number is required.'; }
  else if (!isPhone(phone)) { setHint('ind-phone', 'Enter 10–11 digits.', 'error'); firstError ||= 'Enter a valid phone number (10–11 digits).'; }
  else setHint('ind-phone', '');

  if (!code) firstError ||= 'Please select a country code.';
  if (!sex) firstError ||= 'Please select your sex.';
  if (!country) firstError ||= 'Please select your country.';
  if (!state) firstError ||= 'Please select your state.';

  if (!silent) err.textContent = firstError;
  return !firstError;
}
function indNext() {
  if (!validateIndStep1(false)) { showToast('Please fix the highlighted fields.', true); return; }
  goTo('ind-step2');
  updateProgress(2, 2, 'Professional Profile');
}
function updateIndFields() {
  const status = document.getElementById('ind-profStatus').value;
  const other  = document.getElementById('ind-profOther');
  const bgG    = document.getElementById('ind-bgGroup');
  const intG   = document.getElementById('ind-intGroup');
  if (status === 'others') {
    other.classList.remove('hidden');
    bgG.classList.add('hidden');
    intG.classList.add('hidden');
    return;
  }
  other.classList.add('hidden'); other.value = '';
  const cfg = professionalConfig[status];
  if (!cfg) return;

  document.getElementById('ind-bgLabel').textContent  = cfg.bgLabel + ' *';
  document.getElementById('ind-intLabel').textContent = cfg.intLabel + ' *';
  const bgSel  = document.getElementById('ind-background');
  const intSel = document.getElementById('ind-interest');
  bgSel.innerHTML  = '<option value="" disabled selected>Select background</option>';
  cfg.bg.forEach(o  => bgSel.add(new Option(o.l, o.v)));
  intSel.innerHTML = '<option value="" disabled selected>Select interest</option>';
  cfg.int.forEach(o => intSel.add(new Option(o.l, o.v)));

  bgG.classList.remove('hidden');
  intG.classList.remove('hidden');
  document.getElementById('ind-bgOther').classList.add('hidden');
  document.getElementById('ind-intOther').classList.add('hidden');
}
function validateIndStep2() {
  const err = document.getElementById('ind-err2'); err.textContent = '';
  const status      = document.getElementById('ind-profStatus').value;
  const statusOther = document.getElementById('ind-profOther').value.trim();
  const bg          = document.getElementById('ind-background').value;
  const bgOther     = document.getElementById('ind-bgOther').value.trim();
  const int         = document.getElementById('ind-interest').value;
  const intOther    = document.getElementById('ind-intOther').value.trim();
  const terms       = document.getElementById('ind-terms').checked;

  if (!status) { err.textContent = 'Please select your professional status.'; return false; }
  if (status === 'others' && !statusOther) { err.textContent = 'Please specify your status.'; return false; }
  if (status !== 'others') {
    if (!bg || !int) { err.textContent = 'Please fill in all required fields.'; return false; }
    if (bg === 'others'  && !bgOther)  { err.textContent = 'Please specify your background.'; return false; }
    if (int === 'others' && !intOther) { err.textContent = 'Please specify your interest.'; return false; }
  }
  if (!terms) { err.textContent = 'Please accept the Terms & Conditions to continue.'; return false; }
  return true;
}
async function submitIndividual() {
  if (!validateIndStep2()) { showToast('Please fix the highlighted fields.', true); return; }

  const base = {
    email:        document.getElementById('ind-email').value.trim(),
    password:     document.getElementById('ind-password').value,
    firstName:    document.getElementById('ind-firstName').value.trim(),
    lastName:     document.getElementById('ind-surName').value.trim(),
    otherName:    document.getElementById('ind-otherName').value.trim(),
    phoneNumber:  toE164(
      document.getElementById('ind-countryCode').value,
      document.getElementById('ind-phone').value.trim(),
    ),
    sex:           document.getElementById('ind-sex').value,
    country:       document.getElementById('ind-country').value,
    state_province:document.getElementById('ind-state').value,
    account_type: 'individual',
  };
  const profile = {
    professionalStatus:      document.getElementById('ind-profStatus').value,
    professionalStatusOther: document.getElementById('ind-profOther').value.trim(),
    background:              document.getElementById('ind-background').value,
    backgroundOther:         document.getElementById('ind-bgOther').value.trim(),
    interest:                document.getElementById('ind-interest').value,
    interestOther:           document.getElementById('ind-intOther').value.trim(),
  };

  setSpin('ind-submit', 'ind-spin', true);
  try {
    const res = await api.signup(base);
    if (res?.userId) setPendingProfile(res.userId, 'individual', profile);
    afterSubmit(base.email);
  } catch (err) {
    const msg = err.errors?.[0]?.msg || err.message || 'Registration failed. Please try again.';
    showToast(msg, true);
  } finally {
    setSpin('ind-submit', 'ind-spin', false);
  }
}

// ── Corporate flow ────────────────────────────────────────
function toggleReg() {
  const need = document.getElementById('corp-status').value === 'registered';
  document.getElementById('corp-regWrap').classList.toggle('hidden', !need);
  if (!need) document.getElementById('corp-regNumber').value = '';
}
function validateCorpStep1(silent) {
  const err = document.getElementById('corp-err1');
  if (!silent) err.textContent = '';
  const name   = document.getElementById('corp-name').value.trim();
  const email  = document.getElementById('corp-email').value.trim();
  const pass   = document.getElementById('corp-password').value;
  const conf   = document.getElementById('corp-confirmPassword').value;
  const phone  = document.getElementById('corp-phone').value.trim();
  const status = document.getElementById('corp-status').value;
  const country= document.getElementById('corp-country').value;
  const state  = document.getElementById('corp-state').value;
  const code   = document.getElementById('corp-countryCode').value;
  const reg    = document.getElementById('corp-regNumber').value.trim();

  let firstError = '';
  if (!name) firstError ||= 'Corporate name is required.';
  if (!email) { setHint('corp-email', 'Email is required.', 'error'); firstError ||= 'Email is required.'; }
  else if (!isEmail(email)) { setHint('corp-email', 'Enter a valid email address.', 'error'); firstError ||= 'Enter a valid email address.'; }
  else setHint('corp-email', 'We’ll send a verification link to this address.');

  if (!pass) { setHint('corp-password', 'Password is required.', 'error'); firstError ||= 'Password is required.'; }
  else if (pass.length < 8) { setHint('corp-password', 'Minimum 8 characters.', 'error'); firstError ||= 'Password must be at least 8 characters.'; }
  else setHint('corp-password', 'Looks good.', 'ok');

  if (!conf) { setHint('corp-confirmPassword', 'Please confirm your password.', 'error'); firstError ||= 'Please confirm your password.'; }
  else if (conf !== pass) { setHint('corp-confirmPassword', 'Passwords do not match.', 'error'); firstError ||= 'Passwords do not match.'; }
  else setHint('corp-confirmPassword', 'Passwords match.', 'ok');

  if (!phone) { setHint('corp-phone', 'Phone number is required.', 'error'); firstError ||= 'Phone number is required.'; }
  else if (!isPhone(phone)) { setHint('corp-phone', 'Enter 10–11 digits.', 'error'); firstError ||= 'Enter a valid phone number (10–11 digits).'; }
  else setHint('corp-phone', '');

  if (status === 'registered' && !reg) firstError ||= 'Registration number is required.';
  if (!code) firstError ||= 'Please select a country code.';
  if (!status) firstError ||= 'Please select a corporate status.';
  if (!country) firstError ||= 'Please select your country.';
  if (!state) firstError ||= 'Please select your state.';

  if (!silent) err.textContent = firstError;
  return !firstError;
}
function corpNext() {
  if (!validateCorpStep1(false)) { showToast('Please fix the highlighted fields.', true); return; }
  goTo('corp-step2');
  updateProgress(2, 2, 'Organisation Profile');
}
function updateCorpType() {
  const type = document.getElementById('corp-accountType').value;
  document.getElementById('corp-typeOther').classList.toggle('hidden', type !== 'others');
  if (type !== 'others') document.getElementById('corp-typeOther').value = '';
  document.getElementById('corp-privateGroup').classList.toggle('hidden', type !== 'private');
  document.getElementById('corp-publicGroup').classList.toggle('hidden', type !== 'public');
}
function validateCorpStep2() {
  const err = document.getElementById('corp-err2'); err.textContent = '';
  const type = document.getElementById('corp-accountType').value;
  const typeOther = document.getElementById('corp-typeOther').value.trim();
  const terms = document.getElementById('corp-terms').checked;

  if (!type) { err.textContent = 'Please select Corporate Account Type.'; return false; }
  if (type === 'others' && !typeOther) { err.textContent = 'Please specify the account type.'; return false; }

  if (type === 'private') {
    const org = document.getElementById('corp-orgPrivate').value;
    const orgO= document.getElementById('corp-orgOther').value.trim();
    const sec = document.getElementById('corp-sectorPrivate').value;
    const secO= document.getElementById('corp-sectorPrivOther').value.trim();
    if (!org || !sec) { err.textContent = 'Please fill in all required fields.'; return false; }
    if (org === 'others' && !orgO) { err.textContent = 'Please specify organisation.'; return false; }
    if (sec === 'others' && !secO) { err.textContent = 'Please specify sector.'; return false; }
  }
  if (type === 'public') {
    const org = document.getElementById('corp-orgPublic').value;
    const orgO= document.getElementById('corp-orgPubOther').value.trim();
    const sec = document.getElementById('corp-sectorPublic').value;
    const secO= document.getElementById('corp-sectorPubOther').value.trim();
    if (!org || !sec) { err.textContent = 'Please fill in all required fields.'; return false; }
    if (org === 'others' && !orgO) { err.textContent = 'Please specify organisation.'; return false; }
    if (sec === 'others' && !secO) { err.textContent = 'Please specify sector.'; return false; }
  }
  if (!terms) { err.textContent = 'Please accept the Terms & Conditions to continue.'; return false; }
  return true;
}
async function submitCorporate() {
  if (!validateCorpStep2()) { showToast('Please fix the highlighted fields.', true); return; }

  const type = document.getElementById('corp-accountType').value;
  const base = {
    email:        document.getElementById('corp-email').value.trim(),
    password:     document.getElementById('corp-password').value,
    firstName:    document.getElementById('corp-name').value.trim(),   // backend uses firstName/lastName
    lastName:     '',                                                  // corporations have no surname
    otherName:    document.getElementById('corp-acronym').value.trim(),
    phoneNumber:  toE164(
      document.getElementById('corp-countryCode').value,
      document.getElementById('corp-phone').value.trim(),
    ),
    sex:           'n/a',
    country:       document.getElementById('corp-country').value,
    state_province:document.getElementById('corp-state').value,
    account_type: 'corporate',
  };
  const profile = {
    accountType:      type,
    accountTypeOther: document.getElementById('corp-typeOther').value.trim(),
    organisation: type === 'private' ? document.getElementById('corp-orgPrivate').value
                : type === 'public'  ? document.getElementById('corp-orgPublic').value : '',
    organisationOther: type === 'private' ? document.getElementById('corp-orgOther').value.trim()
                     : type === 'public'  ? document.getElementById('corp-orgPubOther').value.trim() : '',
    sector: type === 'private' ? document.getElementById('corp-sectorPrivate').value
          : type === 'public'  ? document.getElementById('corp-sectorPublic').value : '',
    sectorOther: type === 'private' ? document.getElementById('corp-sectorPrivOther').value.trim()
               : type === 'public'  ? document.getElementById('corp-sectorPubOther').value.trim() : '',
    registrationNumber: document.getElementById('corp-regNumber').value.trim(),
    corporateStatus:    document.getElementById('corp-status').value,
  };

  setSpin('corp-submit', 'corp-spin', true);
  try {
    const res = await api.signup(base);
    if (res?.userId) setPendingProfile(res.userId, 'corporate', profile);
    afterSubmit(base.email);
  } catch (err) {
    const msg = err.errors?.[0]?.msg || err.message || 'Registration failed. Please try again.';
    showToast(msg, true);
  } finally {
    setSpin('corp-submit', 'corp-spin', false);
  }
}

// ── Shared post-submit ────────────────────────────────────
function afterSubmit(email) {
  document.getElementById('verify-email').textContent = email;
  document.getElementById('progressWrap').classList.add('hidden');
  goTo('verify');
  showToast('Account created! Check your email.');
}

// ── Live validation hooks ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ['ind-firstName','ind-surName','ind-email','ind-password','ind-confirmPassword','ind-phone']
    .forEach(id => document.getElementById(id)?.addEventListener('blur', () => validateIndStep1(true)));
  ['ind-password','ind-confirmPassword']
    .forEach(id => document.getElementById(id)?.addEventListener('input', () => validateIndStep1(true)));
  ['corp-name','corp-email','corp-password','corp-confirmPassword','corp-phone']
    .forEach(id => document.getElementById(id)?.addEventListener('blur', () => validateCorpStep1(true)));
  ['corp-password','corp-confirmPassword']
    .forEach(id => document.getElementById(id)?.addEventListener('input', () => validateCorpStep1(true)));
});