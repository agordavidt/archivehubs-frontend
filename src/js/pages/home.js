import { mountPartials } from '../core/include.js';
import { initSession, requireAuth } from '../core/session.js';
import { initNavbar }    from '../components/navbar.js';
import { initFeed }      from '../components/feed.js';
import { initComments }  from '../components/comments.js';

async function boot() {
  console.log('[home] booting…');

  await mountPartials();
  const ok = await requireAuth();
  if (!ok) return;

  initNavbar();

  const feedEl = document.querySelector('.posts-section');
  if (feedEl) { feedEl.innerHTML = ''; initFeed(feedEl); }

  initComments();

  console.log('[home] ready');
}

boot().catch(err => {
  console.error('[home] boot failed:', err);
});