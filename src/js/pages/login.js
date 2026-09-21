import { api } from '../core/api.js';
import { redirectIfAuth } from '../core/session.js';

// ── Boot ────────────────────────────────────────────────────
(async function boot() {
  const alreadyIn = await redirectIfAuth();
  if (alreadyIn) return;
  wireUI();
})();

// ── UI wiring ───────────────────────────────────────────────
function wireUI() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', onSubmit);
  document.getElementById('resendBtn')?.addEventListener('click', resendVerification);

  // Expose for inline onclick handlers still present in the markup
  window.togglePassword = togglePassword;
  window.showLogin      = showLogin;
}

let lastEmail = '';

async function onSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email)    { errEl.textContent = 'Please enter your email.'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Please enter a valid email address.'; return;
  }
  if (!password) { errEl.textContent = 'Please enter your password.'; return; }

  const btn   = document.getElementById('loginBtn');
  const spin  = document.getElementById('loginSpinner');
  btn.disabled = true;
  spin.classList.remove('hidden');

  try {
    await api.login(email, password);
    showToast('Signed in successfully!');
    setTimeout(() => window.location.replace('/pages/home.html'), 500);
  } catch (err) {
    // Verification-specific handling
    if (err.status === 403 || err.code === 'EMAIL_NOT_VERIFIED' ||
        /not verified/i.test(err.message)) {
      lastEmail = email;
      showUnverified(email);
      showToast('Please verify your email to continue.', true);
      return;
    }
    errEl.textContent = err.message || 'Invalid email or password.';
  } finally {
    btn.disabled = false;
    spin.classList.add('hidden');
  }
}

async function resendVerification() {
  const btn  = document.getElementById('resendBtn');
  const spin = document.getElementById('resendSpinner');
  const msg  = document.getElementById('resendMsg');

  msg.textContent = '';
  msg.classList.remove('auth-success');
  msg.classList.add('auth-error');

  if (!lastEmail) { msg.textContent = 'No email on record.'; return; }

  btn.disabled = true;
  spin.classList.remove('hidden');

  try {
    await api.requestVerificationEmail(lastEmail);
    msg.classList.remove('auth-error');
    msg.classList.add('auth-success');
    msg.textContent = 'Verification email sent. Check your inbox.';
    showToast('Verification email sent!');
  } catch (err) {
    msg.textContent = err.message || 'Could not resend. Try again shortly.';
  } finally {
    btn.disabled = false;
    spin.classList.add('hidden');
  }
}

// ── Presentational helpers ─────────────────────────────────
function togglePassword(id, icon) {
  const input = document.getElementById(id);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  icon.classList.toggle('fa-eye', !show);
  icon.classList.toggle('fa-eye-slash', show);
}

function showLogin() {
  document.getElementById('panel-login').classList.add('active');
  document.getElementById('panel-unverified').classList.remove('active');
}

function showUnverified(email) {
  lastEmail = email;
  document.getElementById('unverifiedEmail').textContent = email;
  document.getElementById('resendMsg').textContent = '';
  document.getElementById('panel-login').classList.remove('active');
  document.getElementById('panel-unverified').classList.add('active');
}

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.toggle('error', !!isError);
  t.classList.add('show');
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => t.classList.remove('show'), 3800);
}