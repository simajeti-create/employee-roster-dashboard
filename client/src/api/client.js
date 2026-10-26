const BASE_URL = '/api';
// Held in memory only, so a refresh or closed tab always returns to the login page.
let token = null;

export function getToken() {
  return token;
}

export function setToken(value) {
  token = value;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    // An expired or invalid session on any call except the login itself sends the user back to sign in.
    if (res.status === 401 && path !== '/auth/login') {
      setToken(null);
      window.dispatchEvent(new Event('auth-expired'));
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function get(path) {
  return request(path);
}

export function post(path, data) {
  return request(path, { method: 'POST', body: JSON.stringify(data) });
}

export function put(path, data) {
  return request(path, { method: 'PUT', body: JSON.stringify(data) });
}

export function del(path) {
  return request(path, { method: 'DELETE' });
}
