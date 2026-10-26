import { get, post, put, del } from './client.js';

export function listShifts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return get(`/shifts${query ? `?${query}` : ''}`);
}

export function createShift(data) {
  return post('/shifts', data);
}

export function updateShift(id, data) {
  return put(`/shifts/${id}`, data);
}

export function deleteShift(id) {
  return del(`/shifts/${id}`);
}

export function listBreaksForShift(shiftId) {
  return get(`/shifts/${shiftId}/breaks`);
}

export function importRoster(data) {
  return post('/shifts/import-roster', data);
}

export function bulkSetShifts(data) {
  return post('/shifts/bulk', data);
}

export function applyDefaultShifts(data) {
  return post('/shifts/apply-defaults', data);
}
