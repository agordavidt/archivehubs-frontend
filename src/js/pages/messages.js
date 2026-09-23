import { mountPartials }  from '../core/include.js';
import { requireAuth }    from '../core/session.js';
import { initNavbar }     from '../components/navbar.js';
import { initMessaging }  from '../components/messaging.js';

async function boot() {
  console.log('[messages] booting…');
  await mountPartials();
  const ok = await requireAuth();
  if (!ok) return;

  initNavbar();
  await initMessaging();

  console.log('[messages] ready');
}

boot().catch(err => console.error('[messages] boot failed:', err));