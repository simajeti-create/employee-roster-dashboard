import { get, post } from './client.js';

export function login(username, password) {
  return post('/auth/login', { username, password });
}

export function getMe() {
  return get('/auth/me');
}
