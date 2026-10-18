import { get } from './client.js';

export function getWeeklySummary(weekStart) {
  const query = weekStart ? `?week_start=${weekStart}` : '';
  return get(`/reports/weekly${query}`);
}

export function getRangeSummary({ start, end }) {
  return get(`/reports/summary?start=${start}&end=${end}`);
}

export function getNsaReport({ start, end } = {}) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  const query = params.toString();
  return get(`/reports/nsa${query ? `?${query}` : ''}`);
}
