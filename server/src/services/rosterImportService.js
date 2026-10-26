import db from '../db/connection.js';
import { createShift, updateShift, getShiftByEmployeeAndDate } from './shiftService.js';
import { snapshot, record } from './undoService.js';

const PTO_REASON = 'PTO (roster import)';
const pad = (n) => String(n).padStart(2, '0');

// Imports a monthly roster sheet. Per cell: S1/S2 save a shift, PTO saves an approved
// day of leave (a holiday), X marks the employee as terminated. Blank cells change nothing.
// Rows are matched on Employee ID, then on email. Only S2 shifts feed the NSA report,
// which keys off shifts starting at 17:30 or later.
export function importRoster({ year, month, s1, s2, rows }) {
  const times = { S1: s1, S2: s2 };
  const result = { shifts: 0, pto: 0, terminated: [], unmatched: [], skipped: [] };

  const byCode = db.prepare('SELECT * FROM employees WHERE employee_code = ?');
  const byEmail = db.prepare('SELECT * FROM employees WHERE lower(email) = ?');
  const deleteShift = db.prepare('DELETE FROM shifts WHERE employee_id = ? AND work_date = ?');
  const coveringLeave = db.prepare(
    `SELECT * FROM leaves WHERE employee_id = ? AND status = 'approved' AND start_date <= ? AND end_date >= ?`
  );
  const insertLeave = db.prepare(
    `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, status, reason)
     VALUES (?, 'paid', ?, ?, 'approved', ?)`
  );
  const deleteImportedPto = db.prepare(
    'DELETE FROM leaves WHERE employee_id = ? AND start_date = ? AND end_date = ? AND reason = ?'
  );
  const deactivate = db.prepare(`UPDATE employees SET employment_status = 'inactive' WHERE id = ?`);

  const before = [];
  db.exec('BEGIN');
  try {
    for (const row of rows) {
      const code = String(row.employee_code ?? '').trim();
      const email = String(row.email ?? '').trim().toLowerCase();
      const label = code || email || '(blank)';
      const emp = (code && byCode.get(code)) || (email && byEmail.get(email)) || null;
      if (!emp) {
        result.unmatched.push(label);
        continue;
      }

      for (const [day, rawCode] of Object.entries(row.days ?? {})) {
        const cell = String(rawCode ?? '').trim().toUpperCase();
        if (!cell) continue;
        const date = `${year}-${pad(month)}-${pad(Number(day))}`;

        if (cell === 'S1' || cell === 'S2') {
          if (coveringLeave.all(emp.id, date, date).some((l) => l.reason !== PTO_REASON)) {
            result.skipped.push({ name: emp.name, date, reason: `${cell} skipped, approved leave on that day` });
            continue;
          }
          before.push(...snapshot([{ employee_id: emp.id, work_date: date }]));
          deleteImportedPto.run(emp.id, date, date, PTO_REASON);
          const { start, end } = times[cell];
          const existing = getShiftByEmployeeAndDate(emp.id, date);
          if (existing) updateShift(existing.id, { start_time: start, end_time: end });
          else createShift({ employee_id: emp.id, work_date: date, start_time: start, end_time: end });
          result.shifts++;
        } else if (cell === 'PTO') {
          before.push(...snapshot([{ employee_id: emp.id, work_date: date }]));
          deleteShift.run(emp.id, date);
          if (coveringLeave.all(emp.id, date, date).length === 0) insertLeave.run(emp.id, date, date, PTO_REASON);
          result.pto++;
        } else if (cell === 'X') {
          before.push(...snapshot([{ employee_id: emp.id, work_date: date }]));
          deleteShift.run(emp.id, date);
          if (emp.employment_status !== 'inactive') {
            deactivate.run(emp.id);
            emp.employment_status = 'inactive';
            result.terminated.push(emp.name);
          }
        } else {
          result.skipped.push({ name: emp.name, date, reason: `Unknown code "${rawCode}"` });
        }
      }
    }
    record(`Imported roster ${year}-${pad(month)}`, before);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return result;
}
