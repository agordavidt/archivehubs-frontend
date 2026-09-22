const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const BASE_URL =  import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request(
  path,
  { method = 'GET', body, isForm = false, signal } = {}
) {
  if (USE_MOCK) {
    const { mockRequest } = await import('../mocks/index.js');

    return mockRequest(path, { method, body, isForm });
  }

  const headers = {};

  if (!isForm && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let res;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body
        ? isForm
          ? body
          : JSON.stringify(body)
        : undefined,
      signal,
    });
  } catch {
    throw new ApiError(0, 'Network error');
  }

  const data =
    res.status === 204
      ? null
      : await res.json().catch(() => null);

  if (res.status === 401) {
    if (!path.startsWith('/auth/')) {
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized')
      );
    }

    throw new ApiError(
      401,
      data?.message || 'Unauthorized'
    );
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.message || data?.error || 'Request failed',
      data?.errors
    );
  }

  return data;
}

export const api = {
  // ── AUTH ────────────────────────────────────────────────────

  signup: (data) =>
    request('/auth/signup', {
      method: 'POST',
      body: data,
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  logout: () => request('/auth/logout'),

  requestVerificationEmail: (email) =>
    request('/auth/request-verification-email', {
      method: 'POST',
      body: { email },
    }),

  verifyEmail: (token) =>
    request('/auth/verify-email', {
      method: 'POST',
      body: { token },
    }),

  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (token, newPassword) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    }),

  // ── ACCOUNT ONBOARDING ──────────────────────────────────────

  createIndividualAccount: (data) =>
    request('/account/create-individual-account', {
      method: 'POST',
      body: data,
    }),

  createCorporateAccount: (data) =>
    request('/account/create-corporate-account', {
      method: 'POST',
      body: data,
    }),

  // ── USER ────────────────────────────────────────────────────

  getCurrentUser: () => request('/user'),

  getUserAccounts: () => request('/user/accounts'),

  switchAccount: (accountId, account_type) =>
    request('/user/switch', {
      method: 'POST',
      body: { accountId, account_type },
    }),

  // ── FEED ────────────────────────────────────────────────────

  getFeed: ({ paginate = 0, revalidate = false } = {}) =>
    request(
      `/feed/?paginate=${paginate}${
        revalidate ? '&revalidate=true' : ''
      }`
    ),

  // ── POSTS ───────────────────────────────────────────────────

  createPost: ({ textContent, tags = [], media = [] }) => {
    const form = new FormData();

    form.append('textContent', textContent);

    media.forEach((f) => form.append('media', f));

    form.append('tags', JSON.stringify(tags));

    return request('/post/create', {
      method: 'POST',
      body: form,
      isForm: true,
    });
  },

  likePost: (id) =>
    request(`/post/${id}/like`, {
      method: 'POST',
    }),

  unlikePost: (id) =>
    request(`/post/${id}/unlike`, {
      method: 'POST',
    }),

  deletePost: (postId) =>
    request('/post/delete', {
      method: 'POST',
      body: { postId },
    }),

  // ── COMMENTS ────────────────────────────────────────────────

  getComments: (postId) =>
    request(`/post/${postId}/comments`),

  addComment: (postId, comment) =>
    request('/post/comment', {
      method: 'POST',
      body: { postId, comment },
    }),

    createStory: ({ media, caption, bg, font, size, colour }) => {
    const form = new FormData();
    if (media)  form.append('media', media);
    form.append('caption', caption || '');
    form.append('bg', bg || '');
    form.append('font', font || '');
    form.append('size', String(size || 18));
    form.append('colour', colour || '');
    return request('/stories', { method: 'POST', body: form, isForm: true });
  },
};
