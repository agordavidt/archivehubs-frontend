import { mountPartials }        from '../core/include.js';
import { requireAuth }          from '../core/session.js';
import { initNavbar }           from '../components/navbar.js';
import { initFeed }             from '../components/feed.js';
import { initComments }         from '../components/comments.js';
import { initCreatePost }       from '../components/create-post.js';
import { initCreateStory }      from '../components/create-story.js';
import { initStories }          from '../components/stories.js';
import { initHomeSidebar }      from '../components/home-sidebar.js';
import { initMessagingWidget }  from '../components/messaging-widget.js';

async function boot() {
  await mountPartials();
  const ok = await requireAuth();
  if (!ok) return;

  initNavbar();
  initFeed(document.querySelector('.posts-section'));
  initComments();
  initCreatePost();
  initCreateStory();
  initStories();
  initHomeSidebar();
  initMessagingWidget();       // ← NEW

  console.log('[home] ready');
}

boot().catch(err => console.error('[home] boot failed:', err));