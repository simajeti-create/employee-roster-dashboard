import db from '../db/connection.js';
import { resolveShiftDateTimes } from '../utils/dateUtils.js';

export function listShifts({ start, end, employee_id } = {}) {
  let sql = 'SELECT * FROM shifts WHERE 1=1';
  const params = [];
  if (start) {
    sql += ' AND work_date >= ?';
    params.push(start);
  }
  if (end) {
    sql += ' AND work_date <= ?';
    params.push(end);
  }
  if (employee_id) {
    sql += ' AND employee_id = ?';
    params.push(employee_id);
  }
  sql += ' ORDER BY work_date, employee_id';
  return db.prepare(sql).all(...params);
}

export function getShift(id) {
  return db.prepare('SELECT * FROM shifts WHERE id = ?').get(id);
}

export function getShiftByEmployeeAndDate(employee_id, work_date) {
  return db.prepare('SELECT * FROM shifts WHERE employee_id = ? AND work_date = ?').get(employee_id, work_date);
}

export function createShift({ employee_id, work_date, start_time, end_time, notes }) {
  const resolved = resolveShiftDateTimes(work_date, start_time, end_time);
  const stmt = db.prepare(`
    INSERT INTO shifts (employee_id, work_date, start_time, end_time, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(employee_id, work_date, resolved.start_time, resolved.end_time, notes ?? null);
  return getShift(Number(result.lastInsertRowid));
}

export function updateShift(id, { work_date, start_time, end_time, notes }) {
  const existing = getShift(id);
  if (!existing) return null;
  const finalWorkDate = work_date ?? existing.work_date;
  const resolved = resolveShiftDateTimes(
    finalWorkDate,
    start_time ?? existing.start_time,
    end_time ?? existing.end_time
  );
  const stmt = db.prepare(`
    UPDATE shifts SET work_date = ?, start_time = ?, end_time = ?, notes = ?
    WHERE id = ?
  `);
  stmt.run(finalWorkDate, resolved.start_time, resolved.end_time, notes ?? existing.notes, id);
  return getShift(id);
}

export function deleteShift(id) {
  const result = db.prepare('DELETE FROM shifts WHERE id = ?').run(id);
  return result.changes > 0;
}
