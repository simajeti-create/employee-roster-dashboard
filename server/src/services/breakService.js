import db from '../db/connection.js';

export function listBreaksForShift(shift_id) {
  return db.prepare('SELECT * FROM breaks WHERE shift_id = ? ORDER BY start_time').all(shift_id);
}

export function getBreak(id) {
  return db.prepare('SELECT * FROM breaks WHERE id = ?').get(id);
}

export function createBreak({ shift_id, start_time, end_time }) {
  const stmt = db.prepare('INSERT INTO breaks (shift_id, start_time, end_time) VALUES (?, ?, ?)');
  const result = stmt.run(shift_id, start_time, end_time ?? null);
  return getBreak(Number(result.lastInsertRowid));
}

export function updateBreak(id, { start_time, end_time }) {
  const existing = getBreak(id);
  if (!existing) return null;
  const stmt = db.prepare('UPDATE breaks SET start_time = ?, end_time = ? WHERE id = ?');
  stmt.run(start_time ?? existing.start_time, end_time === undefined ? existing.end_time : end_time, id);
  return getBreak(id);
}

export function deleteBreak(id) {
  const result = db.prepare('DELETE FROM breaks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listOpenBreaksForDate(work_date) {
  return db.prepare(`
    SELECT breaks.*, shifts.employee_id
    FROM breaks
    JOIN shifts ON shifts.id = breaks.shift_id
    WHERE breaks.end_time IS NULL AND shifts.work_date = ?
  `).all(work_date);
}

export function listBreaksForDateRange(start, end) {
  return db.prepare(`
    SELECT breaks.*, shifts.employee_id, shifts.work_date
    FROM breaks
    JOIN shifts ON shifts.id = breaks.shift_id
    WHERE shifts.work_date BETWEEN ? AND ?
  `).all(start, end);
}
