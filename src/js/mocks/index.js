import userJSON from './data/user.json';
import feedJSON from './data/feed.json';
import commentsJSON from './data/comments.json';
import accountsJSON from './data/accounts.json';
import storiesJSON from './data/stories.json';

const delay = (ms) => new Promise(r => setTimeout(r, ms));
async function tick() { await delay(60 + Math.random() * 90); }  // was 200-400

const stories = storiesJSON.stories.map(s => ({ ...s }));
let nextStoryId = 100;

// ── Persistent mock state ─────────────────────────────────
const MOCK_SESSION_KEY = 'ah:mock:userId';
const MOCK_USERS_KEY = 'ah:mock:users';
const MOCK_ACTIVE_KEY = 'ah:mock:activeAccountId';

function currentActiveId() {
  try {
    return localStorage.getItem(MOCK_ACTIVE_KEY);
  } catch {
    return null;
  }
}

function setActiveId(id) {
  try {
    if (id) localStorage.setItem(MOCK_ACTIVE_KEY, id);
    else localStorage.removeItem(MOCK_ACTIVE_KEY);
  } catch {}
}

/** @type {Array<{id:string,email:string,password:string,firstName:string,...}>} */
let users = loadUsers();

function loadUsers() {
  try {
    const raw = localStorage.getItem(MOCK_USERS_KEY);

    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  const seed = [
    {
      id: 'u-john-001',
      email: 'john@archivehubs.dev',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      otherName: '',
      phoneNumber: '+2348000000000',
      sex: 'male',
      country: 'Nigeria',
      state_province: 'Lagos',
      account_type: 'individual',
      isVerified: true,
      profilePic: 'images/profile.jpg',
      createdAt: 1737000000000,
    },
  ];

  saveUsers(seed);

  return seed;
}

function saveUsers(list) {
  try {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(list));
  } catch {}
}

function currentUserId() {
  try {
    return localStorage.getItem(MOCK_SESSION_KEY);
  } catch {
    return null;
  }
}

function setCurrentUserId(id) {
  try {
    if (id) localStorage.setItem(MOCK_SESSION_KEY, id);
    else localStorage.removeItem(MOCK_SESSION_KEY);
  } catch {}
}

// ── Mutable mock feed/comments state ──────────────────────
const posts = feedJSON.posts.map((p) => ({ ...p }));
const comments = commentsJSON.comments.map((c) => ({ ...c }));
let nextCommentId = 9000;

// ── Dispatcher ────────────────────────────────────────────
export async function mockRequest(path, { method = 'GET', body } = {}) {
  await tick();

  const [pathname, qs] = path.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));

  // ════════════ AUTH ════════════

  // POST /auth/signup
  if (method === 'POST' && pathname === '/auth/signup') {
    const {
      email,
      password,
      firstName,
      lastName,
      otherName,
      phoneNumber,
      sex,
      country,
      state_province,
      account_type,
    } = body || {};

    if (!email || !password) {
      throw mockError(400, 'Email and password are required');
    }

    if (
      users.some(
        (u) => u.email.toLowerCase() === String(email).toLowerCase()
      )
    ) {
      throw mockError(400, 'User Email already exists');
    }

    const user = {
      id: `u-${Date.now().toString(36)}`,
      email,
      password,
      firstName,
      lastName,
      otherName: otherName || '',
      phoneNumber,
      sex,
      country,
      state_province,
      account_type: account_type || 'individual',
      isVerified: false,
      profilePic: 'images/profile.jpg',
      createdAt: Date.now(),
    };

    users.push(user);
    saveUsers(users);

    return {
      message: 'User created!',
      userId: user.id,
    };
  }

  // POST /auth/login
  if (method === 'POST' && pathname === '/auth/login') {
    const { email, password } = body || {};

    const user = users.find(
      (u) => u.email.toLowerCase() === String(email || '').toLowerCase()
    );

    if (!user || user.password !== password) {
      throw mockError(401, 'Invalid credentials');
    }

    if (!user.isVerified) {
      // Matches backend: 403 with reason
      const err = mockError(403, 'Email not verified');
      err.code = 'EMAIL_NOT_VERIFIED';
      throw err;
    }

    setCurrentUserId(user.id);

    return {
      message: 'Logged in',
    };
  }

  // GET /auth/logout
  if (method === 'GET' && pathname === '/auth/logout') {
    setCurrentUserId(null);
    setActiveId(null);

    return null;
  }

  // POST /auth/verify-email
  if (method === 'POST' && pathname === '/auth/verify-email') {
    const { token } = body || {};

    // In mock, any non-empty token verifies the most recently signed-up
    // unverified user
    if (!token) {
      throw mockError(400, 'Token is required');
    }

    const pending = users.filter((u) => !u.isVerified);

    if (!pending.length) {
      throw mockError(400, 'Verification token is invalid or has expired');
    }

    pending.forEach((u) => {
      u.isVerified = true;
    });

    saveUsers(users);

    return {
      message: 'Email verified successfully',
      email: pending[0].email,
    };
  }

  // POST /auth/request-verification-email
  if (
    method === 'POST' &&
    pathname === '/auth/request-verification-email'
  ) {
    const { email } = body || {};

    const user = users.find(
      (u) => u.email.toLowerCase() === String(email || '').toLowerCase()
    );

    if (!user) {
      throw mockError(404, 'User not found or already verified');
    }

    return {
      message: 'Verification email sent',
    };
  }

  // POST /auth/forgot-password
  if (method === 'POST' && pathname === '/auth/forgot-password') {
    const { email } = body || {};

    const user = users.find(
      (u) => u.email.toLowerCase() === String(email || '').toLowerCase()
    );

    if (!user) {
      throw mockError(404, 'User not found');
    }

    return {
      message: 'Password email sent',
    };
  }

  // POST /auth/reset-password
  if (method === 'POST' && pathname === '/auth/reset-password') {
    const { token, newPassword } = body || {};

    if (!token || !newPassword) {
      throw mockError(400, 'Token and newPassword required');
    }

    // Mock: reset the first user matching the current seed
    // (just a placeholder)
    const u = users[0];

    u.password = newPassword;
    saveUsers(users);

    return {
      message: 'Password has been reset',
      email: u.email,
    };
  }

  // ════════════ ACCOUNT ONBOARDING ════════════

  if (
    method === 'POST' &&
    pathname === '/account/create-individual-account'
  ) {
    const { userId, ...profile } = body || {};
    const user = users.find((u) => u.id === userId);

    if (!user) {
      throw mockError(404, 'User not found');
    }

    user.individualProfile = profile;
    saveUsers(users);

    return {
      message: 'Individual profile saved',
    };
  }

  if (
    method === 'POST' &&
    pathname === '/account/create-corporate-account'
  ) {
    const { userId, ...profile } = body || {};
    const user = users.find((u) => u.id === userId);

    if (!user) {
      throw mockError(404, 'User not found');
    }

    user.corporateProfile = profile;
    saveUsers(users);

    return {
      message: 'Corporate profile saved',
    };
  }

  // ════════════ USER ════════════

  // ── GET /user/accounts ─────────────────────────────────────
  if (method === 'GET' && pathname === '/user/accounts') {
    const id = currentUserId();

    if (!id) {
      throw mockError(401, 'Unauthorized');
    }

    // In mock, John owns both accounts. In real backend this
    // would traverse (person)-[:OWNS]->(accounts).
    const list = accountsJSON.accounts.filter(
      () => id === 'u-john-001' || true
    );

    const activeId = currentActiveId() || id;
    const active = list.find((a) => a.id === activeId) || list[0];

    return {
      active: {
        id: active.id,
        account_type: active.account_type,
      },
      accounts: list,
    };
  }

  // ── POST /user/switch ─────────────────────────────────────
  if (method === 'POST' && pathname === '/user/switch') {
    const id = currentUserId();

    if (!id) {
      throw mockError(401, 'Unauthorized');
    }

    const { accountId } = body || {};

    const account = accountsJSON.accounts.find(
      (a) => a.id === accountId
    );

    if (!account) {
      throw mockError(404, 'Account not found');
    }

    setActiveId(account.id);

    return {
      message: 'Switched account',
      account: {
        id: account.id,
        account_type: account.account_type,
      },
    };
  }

  // GET /user
  if (method === 'GET' && pathname === '/user') {
    const personId = currentUserId();

    if (!personId) {
      throw mockError(401, 'Unauthorized');
    }

    const activeId = currentActiveId() || personId;

    // If the active account is corporate, fabricate a corporate shape
    if (activeId.startsWith('b-')) {
      const acct = accountsJSON.accounts.find(
        (a) => a.id === activeId
      );

      return {
        id: acct.id,
        account_type: 'corporate',
        name: acct.displayName,
        logo: acct.avatar,
        headline: acct.headline,
        isVerified: true,
      };
    }

    // Otherwise return the person
    const user = users.find((u) => u.id === personId);

    if (!user) {
      setCurrentUserId(null);
      throw mockError(401, 'Unauthorized');
    }

    const { password: _pw, ...safe } = user;

    return safe;
  }

  // ════════════ FEED / POSTS / COMMENTS (unchanged) ════════════

  if (method === 'GET' && /^\/feed\/?$/.test(pathname)) {
    const page = Number(params.paginate || 0);
    const limit = 25 * (page + 1);

    return {
      message: 'Mock feed retrieved successfully',
      posts: posts.slice(0, limit),
    };
  }

  const likeMatch = pathname.match(/^\/post\/([^/]+)\/like$/);

  if (method === 'POST' && likeMatch) {
    const p = posts.find((x) => x.id === likeMatch[1]);

    if (!p) {
      throw mockError(404, 'Post not found');
    }

    if (!p.isLiked) {
      p.isLiked = true;
      p.likeCount += 1;
    }

    return {
      message: 'Post liked successfully',
    };
  }

  const unlikeMatch = pathname.match(/^\/post\/([^/]+)\/unlike$/);

  if (method === 'POST' && unlikeMatch) {
    const p = posts.find((x) => x.id === unlikeMatch[1]);

    if (!p) {
      throw mockError(404, 'Post not found');
    }

    if (p.isLiked) {
      p.isLiked = false;
      p.likeCount -= 1;
    }

    return {
      message: 'Post unliked successfully',
    };
  }

  const getCommentsMatch = pathname.match(
    /^\/post\/([^/]+)\/comments$/
  );

  if (method === 'GET' && getCommentsMatch) {
    return {
      comments: comments.filter(
        (c) => c.postId === getCommentsMatch[1]
      ),
    };
  }

  if (method === 'POST' && pathname === '/post/comment') {
    const { postId, comment } = body;
    const id = currentUserId();
    const me = users.find((u) => u.id === id);

    const created = {
      id: `c${nextCommentId++}`,
      postId,
      text: comment,
      createdAt: Date.now(),
      author: me
        ? {
            id: me.id,
            name: `${me.firstName} ${me.lastName}`.trim(),
            profilePic: me.profilePic || 'images/profile.jpg',
          }
        : {
            id: 'me',
            name: 'You',
            profilePic: 'images/profile.jpg',
          },
      parentId: null,
    };

    comments.push(created);

    const p = posts.find((x) => x.id === postId);

    if (p) {
      p.commentCount += 1;
    }

    const { postId: _pid, ...backendShape } = created;

    return {
      message: 'Comment added successfully',
      comment: backendShape,
    };
  }


  // ════════════ POSTS (create) ════════════
  if (method === 'POST' && pathname === '/post/create') {
    const personId = currentUserId();
    if (!personId) throw mockError(401, 'Unauthorized');

    const me = users.find(u => u.id === personId);
    const textContent = body.get('textContent') || '';
    const tagsStr = body.get('tags');
    const tags = tagsStr ? JSON.parse(tagsStr) : [];
    const mediaFiles = body.getAll('media').filter(x => x instanceof File);

    const mediaUrls = mediaFiles.map(f => URL.createObjectURL(f));

    const post = {
      id: `p-${Date.now().toString(36)}`,
      textContent: stripHtml(textContent),
      createdAt: Date.now(),
      mediaUrls,
      authorName: me ? `${me.firstName} ${me.lastName}`.trim() : 'You',
      userProfilePic: me?.profilePic || 'images/profile.jpg',
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      tags,
    };

    posts.unshift(post);

    return { message: 'Post created successfully', post };
  }

  // ════════════ STORIES ════════════
  if (method === 'POST' && pathname === '/stories') {
    const personId = currentUserId();
    if (!personId) throw mockError(401, 'Unauthorized');
    const me = users.find(u => u.id === personId);

    // body here is an object (component sends JSON to api.createStory in mock
    // only if we adapt it — see note below). For now accept both shapes.
    const data = body instanceof FormData
      ? { caption: body.get('caption'), bg: body.get('bg'), media: body.get('media') }
      : (body || {});

    const mediaUrls = data.media instanceof File ? [URL.createObjectURL(data.media)] : [];

    const story = {
      id: `s-${Date.now().toString(36)}`,
      authorId: personId,
      authorName: me ? `${me.firstName} ${me.lastName}`.trim() : 'You',
      authorAvatar: me?.profilePic || 'images/profile.jpg',
      mediaUrls,
      caption: data.caption || '',
      bg: data.bg || '#4a90e2',
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    return { message: 'Story created', story };
  }

  // Search — needed by tag-people autocomplete
  if (method === 'POST' && pathname === '/search/search_activity') {
    const { searchTerm = '' } = body || {};
    const q = searchTerm.toLowerCase();
    const matches = users
      .filter(u => u.id !== currentUserId())
      .filter(u => {
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        return !q || name.includes(q) || u.email.toLowerCase().includes(q);
      })
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        account_type: u.account_type || 'individual',
        name: `${u.firstName} ${u.lastName}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        profilePic: u.profilePic,
        email: u.email,
        headline: u.headline || '',
      }));
    return { users: matches };
  }

    // ── GET /stories ───────────────────────────────────────────
    if (method === 'GET' && pathname === '/stories') {
      const active = stories
        .filter(s => s.expiresAt > Date.now())
        .sort((a, b) => b.createdAt - a.createdAt);
      return { stories: active };
    }

    // ── POST /stories ──────────────────────────────────────────
    if (method === 'POST' && pathname === '/stories') {
      const personId = currentUserId();
      if (!personId) throw mockError(401, 'Unauthorized');
      const me = users.find(u => u.id === personId);

      const data = body instanceof FormData
        ? {
            caption: body.get('caption') || '',
            bg:      body.get('bg') || '#4a90e2',
            media:   body.get('media'),
            font:    body.get('font') || '',
            size:    Number(body.get('size')) || 18,
            colour:  body.get('colour') || '#ffffff',
          }
        : (body || {});

      const mediaUrls = data.media instanceof File ? [URL.createObjectURL(data.media)] : [];

      const story = {
        id: `s-${Date.now().toString(36)}`,
        authorId: personId,
        authorName: me ? `${me.firstName} ${me.lastName}`.trim() : 'You',
        authorAvatar: me?.profilePic || 'images/profile.jpg',
        mediaUrls,
        caption: data.caption || '',
        bg: data.bg || '#4a90e2',
        font: data.font || '',
        size: data.size || 18,
        colour: data.colour || '#ffffff',
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      stories.unshift(story);
      return { message: 'Story created', story };
    }

  throw mockError(501, `[mock] Unhandled: ${method} ${path}`);
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

function mockError(status, message) {
  const e = new Error(message);
  e.status = status;

  return e;
}
