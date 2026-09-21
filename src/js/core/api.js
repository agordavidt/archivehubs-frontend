const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request(path, { method = 'GET', body, isForm = false, signal } = {}) {
  if (USE_MOCK) {
    const { mockRequest } = await import('../mocks/index.js');
    return mockRequest(path, { method, body, isForm });
  }

  const headers = {};
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal,
    });
  } catch {
    throw new ApiError(0, 'Network error');
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (res.status === 401) {
    if (!path.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new ApiError(401, data?.message || 'Unauthorized');
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
  // auth
  login:  (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: ()                => request('/auth/logout'),

  // user
  getCurrentUser: ()        => request('/user'),

  // feed
  getFeed: ({ paginate = 0, revalidate = false } = {}) =>
    request(`/feed/?paginate=${paginate}${revalidate ? '&revalidate=true' : ''}`),

  // posts
  likePost:   (postId) => request(`/post/${postId}/like`,   { method: 'POST' }),
  unlikePost: (postId) => request(`/post/${postId}/unlike`, { method: 'POST' }),

  // comments
  getComments: (postId)          => request(`/post/${postId}/comments`),
  addComment:  (postId, comment) => request('/post/comment', { method: 'POST', body: { postId, comment } }),
};