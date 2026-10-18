import db from '../db/connection.js';
import { resolveShiftDateTimes, addDays } from '../utils/dateUtils.js';
import { listLeavesForDateRange } from './leaveService.js';
import { snapshot, record } from './undoService.js';

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

// Sets one shift time for an employee across [start, end]: updates days that already have a
// shift (breaks stay attached), creates the rest, and skips approved leave. Weekends are
// skipped unless include_weekends is set.
export function bulkSetShifts({ employee_id, start, end, start_time, end_time, include_weekends }) {
  const leaves = listLeavesForDateRange(start, end).filter((l) => l.employee_id === employee_id);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const before = [];
  db.exec('BEGIN');
  try {
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const dow = new Date(`${d}T00:00:00`).getDay();
      const weekend = dow === 0 || dow === 6;
      const onLeave = leaves.some((l) => l.start_date <= d && l.end_date >= d);
      if ((weekend && !include_weekends) || onLeave) {
        skipped++;
        continue;
      }
      before.push(...snapshot([{ employee_id, work_date: d }]));
      const existing = getShiftByEmployeeAndDate(employee_id, d);
      if (existing) {
        updateShift(existing.id, { start_time, end_time });
        updated++;
      } else {
        createShift({ employee_id, work_date: d, start_time, end_time });
        created++;
      }
    }
    record(`Changed shifts ${start} to ${end}`, before);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { created, updated, skipped };
}

// Saves each active employee's default shift as a real shift for every weekday in
// [start, end] that has no shift yet and no approved leave. Existing shifts are never touched.
export function applyDefaultShifts({ start, end, employee_ids }) {
  const employees = db
    .prepare(`SELECT * FROM employees
              WHERE employment_status = 'active'
                AND default_shift_start IS NOT NULL AND default_shift_start != ''
                AND default_shift_end IS NOT NULL AND default_shift_end != ''`)
    .all()
    .filter((e) => !employee_ids || employee_ids.includes(e.id));

  const existing = new Set(
    listShifts({ start, end }).map((s) => `${s.employee_id}|${s.work_date}`)
  );
  const leaves = listLeavesForDateRange(start, end);

  const dates = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const dow = new Date(`${d}T00:00:00`).getDay();
    if (dow !== 0 && dow !== 6) dates.push(d);
  }

  let created = 0;
  let skipped = 0;
  const before = [];
  db.exec('BEGIN');
  try {
    for (const emp of employees) {
      for (const date of dates) {
        const onLeave = leaves.some((l) => l.employee_id === emp.id && l.start_date <= date && l.end_date >= date);
        if (onLeave || existing.has(`${emp.id}|${date}`)) {
          skipped++;
          continue;
        }
        before.push(...snapshot([{ employee_id: emp.id, work_date: date }]));
        createShift({
          employee_id: emp.id,
          work_date: date,
          start_time: emp.default_shift_start,
          end_time: emp.default_shift_end,
        });
        created++;
      }
    }
    record(`Saved default shifts ${start} to ${end}`, before);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { created, skipped };
}
