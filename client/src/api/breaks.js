import { post, put, del } from './client.js';

export function createBreak(data) {
  return post('/breaks', data);
}

export function updateBreak(id, data) {
  return put(`/breaks/${id}`, data);
}

export function deleteBreak(id) {
  return del(`/breaks/${id}`);
}
