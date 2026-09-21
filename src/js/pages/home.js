import { initSession }  from '../core/session.js';
import { initFeed }     from '../components/feed.js';
import { initComments } from '../components/comments.js';

async function boot() {
  console.log('[home] booting…');

  await initSession();
  console.log('[home] session ready');

  const feedEl = document.querySelector('.posts-section');
  if (feedEl) {
    feedEl.innerHTML = '';   // clear the loading spinner
    initFeed(feedEl);
  }

  initComments();

  console.log('[home] ready');
  console.log('USE_MOCK env:', import.meta.env.VITE_USE_MOCK);
}

boot().catch(err => {
  console.error('[home] boot failed:', err);
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<pre style="background:#fee;padding:12px;color:#900;font:12px monospace;">Boot failed: ${err.message}</pre>`
  );
});