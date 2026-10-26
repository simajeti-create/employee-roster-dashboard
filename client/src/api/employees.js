import { get, post, put, del } from './client.js';

export function listEmployees(params = {}) {
  const query = new URLSearchParams(params).toString();
  return get(`/employees${query ? `?${query}` : ''}`);
}

export function createEmployee(data) {
  return post('/employees', data);
}

export function updateEmployee(id, data) {
  return put(`/employees/${id}`, data);
}

export function importEmployees(rows) {
  return post('/employees/import', { rows });
}

export function deleteEmployee(id) {
  return del(`/employees/${id}`);
}
