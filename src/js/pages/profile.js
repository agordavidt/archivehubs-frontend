import { mountPartials }        from '../core/include.js';
import { requireAuth }          from '../core/session.js';
import { initNavbar }           from '../components/navbar.js';
import { initProfile }          from '../components/profile.js';
import { initMessagingWidget }  from '../components/messaging-widget.js';

async function boot() {
  await mountPartials();
  const ok = await requireAuth();
  if (!ok) return;

  initNavbar();
  await initProfile();
  initMessagingWidget();
}

boot().catch(err => console.error('[profile] boot failed:', err));