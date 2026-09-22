import { mountPartials }   from '../core/include.js';
import { requireAuth }     from '../core/session.js';
import { initNavbar }      from '../components/navbar.js';
import { initConnections } from '../components/connections.js';

async function boot() {
  await mountPartials();
  const ok = await requireAuth();
  if (!ok) return;

  initNavbar();
  initConnections();

  // Support deep-link ?tab=suggestions
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab) {
    document.querySelector(`.cp-tab[data-tab="${tab}"]`)?.click();
  }
}

boot().catch(err => console.error('[connections] boot failed:', err));