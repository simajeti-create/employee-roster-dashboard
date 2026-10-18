import { addDays, formatDate } from './dateUtils.js';

export function monthRange(year, month) {
  const first = formatDate(new Date(year, month, 1));
  const last = formatDate(new Date(year, month + 1, 0));
  return { first, last };
}

// Number of days an inclusive [start, end] range overlaps an inclusive [from, to] window.
export function overlapDays(start, end, from, to) {
  const s = start > from ? start : from;
  const e = end < to ? end : to;
  if (e < s) return 0;
  return Math.round((new Date(`${e}T00:00:00`) - new Date(`${s}T00:00:00`)) / 86400000) + 1;
}

export { addDays };
