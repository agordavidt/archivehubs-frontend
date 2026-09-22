import { mountPartials }        from '../core/include.js';
import { requireAuth }          from '../core/session.js';
import { initNavbar }           from '../components/navbar.js';
import { initFeed }             from '../components/feed.js';
import { initComments }         from '../components/comments.js';
import { initCreatePost }       from '../components/create-post.js';
import { initCreateStory }      from '../components/create-story.js';

async function boot() {
  console.log('[home] booting…');

  await mountPartials();
  const ok = await requireAuth();
  if (!ok) return;

  initNavbar();
  initFeed(document.querySelector('.posts-section'));
  initComments();
  initCreatePost();
  initCreateStory();

  console.log('[home] ready');
}

boot().catch(err => {
  console.error('[home] boot failed:', err);
});