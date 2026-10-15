import { get } from './client.js';

export function getCurrentlyActive() {
  return get('/active');
}
