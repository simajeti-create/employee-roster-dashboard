import { get, post, put, del } from './client.js';

export function listLeaves(params = {}) {
  const query = new URLSearchParams(params).toString();
  return get(`/leaves${query ? `?${query}` : ''}`);
}

export function createLeave(data) {
  return post('/leaves', data);
}

export function updateLeave(id, data) {
  return put(`/leaves/${id}`, data);
}

export function deleteLeave(id) {
  return del(`/leaves/${id}`);
}

export function importLeaves(rows) {
  return post('/leaves/import', { rows });
}
