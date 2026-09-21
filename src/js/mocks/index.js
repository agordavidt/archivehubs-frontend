import userJSON     from './data/user.json';
import feedJSON     from './data/feed.json';
import commentsJSON from './data/comments.json';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Simulated network latency so spinners/optimistic UI actually get exercised
async function tick() { await delay(250 + Math.random() * 250); }

// In-memory mutation state so like/unlike/comment persist for the session
const posts    = feedJSON.posts.map(p => ({ ...p }));
const comments = commentsJSON.comments.map(c => ({ ...c }));
let nextCommentId = 9000;

export async function mockRequest(path, { method = 'GET', body } = {}) {
  await tick();

  const [pathname, qs] = path.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));

  // ── GET /user ─────────────────────────────────────────────
  if (method === 'GET' && pathname === '/user') {
    return userJSON;
  }

  // ── GET /feed/?paginate=N ─────────────────────────────────
  // Mirrors the real backend's accumulated-cache behavior:
  // paginate=0 → first 25, paginate=1 → first 50, etc.
  if (method === 'GET' && /^\/feed\/?$/.test(pathname)) {
    const page  = Number(params.paginate || 0);
    const limit = 25 * (page + 1);
    return {
      message: 'Mock feed retrieved successfully',
      posts:   posts.slice(0, limit),
    };
  }

  // ── POST /post/:id/like ───────────────────────────────────
  const likeMatch = pathname.match(/^\/post\/([^/]+)\/like$/);
  if (method === 'POST' && likeMatch) {
    const p = posts.find(x => x.id === likeMatch[1]);
    if (!p) throw mockError(404, 'Post not found');
    if (!p.isLiked) { p.isLiked = true; p.likeCount += 1; }
    return { message: 'Post liked successfully' };
  }

  // ── POST /post/:id/unlike ─────────────────────────────────
  const unlikeMatch = pathname.match(/^\/post\/([^/]+)\/unlike$/);
  if (method === 'POST' && unlikeMatch) {
    const p = posts.find(x => x.id === unlikeMatch[1]);
    if (!p) throw mockError(404, 'Post not found');
    if (p.isLiked) { p.isLiked = false; p.likeCount -= 1; }
    return { message: 'Post unliked successfully' };
  }

  // ── GET /post/:postId/comments ────────────────────────────
  const getCommentsMatch = pathname.match(/^\/post\/([^/]+)\/comments$/);
  if (method === 'GET' && getCommentsMatch) {
    const postId = getCommentsMatch[1];
    return {
      comments: comments.filter(c => c.postId === postId),
    };
  }

  // ── POST /post/comment ────────────────────────────────────
  if (method === 'POST' && pathname === '/post/comment') {
    const { postId, comment } = body;
    const created = {
      id:        `c${nextCommentId++}`,
      postId,
      text:      comment,
      createdAt: Date.now(),
      author: {
        id:         userJSON.id,
        name:       `${userJSON.firstName} ${userJSON.lastName}`.trim(),
        profilePic: userJSON.profilePic || 'images/profile.jpg',
      },
      parentId: null,
    };
    comments.push(created);

    const p = posts.find(x => x.id === postId);
    if (p) p.commentCount += 1;

    // Backend returns just the raw comment node (no author, no parentId)
    const { postId: _pid, ...backendShape } = created;
    return { message: 'Comment added successfully', comment: backendShape };
  }

  // ── Fallthrough ───────────────────────────────────────────
  throw mockError(501, `[mock] Unhandled: ${method} ${path}`);
}

function mockError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}