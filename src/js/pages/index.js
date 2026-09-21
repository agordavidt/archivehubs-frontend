import { redirectIfAuth } from '../core/session.js';

(async function boot() {
  const authed = await redirectIfAuth();
  // redirectIfAuth navigates to /pages/home.html if a session exists.
  // Otherwise, after a short loading animation, go to login.
  if (authed) return;
  setTimeout(() => window.location.replace('/pages/login.html'), 2400);
})();