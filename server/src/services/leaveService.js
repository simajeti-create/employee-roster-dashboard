import db from '../db/connection.js';

export function listLeaves({ employee_id, status, start, end } = {}) {
  let sql = 'SELECT * FROM leaves WHERE 1=1';
  const params = [];
  if (employee_id) {
    sql += ' AND employee_id = ?';
    params.push(employee_id);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (start) {
    sql += ' AND end_date >= ?';
    params.push(start);
  }
  if (end) {
    sql += ' AND start_date <= ?';
    params.push(end);
  }
  sql += ' ORDER BY start_date DESC';
  return db.prepare(sql).all(...params);
}

export function getLeave(id) {
  return db.prepare('SELECT * FROM leaves WHERE id = ?').get(id);
}

export function createLeave({ employee_id, leave_type, start_date, end_date, status, reason }) {
  const stmt = db.prepare(`
    INSERT INTO leaves (employee_id, leave_type, start_date, end_date, status, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(employee_id, leave_type, start_date, end_date, status ?? 'pending', reason ?? null);
  return getLeave(Number(result.lastInsertRowid));
}

export function updateLeave(id, { leave_type, start_date, end_date, status, reason }) {
  const existing = getLeave(id);
  if (!existing) return null;
  const stmt = db.prepare(`
    UPDATE leaves SET leave_type = ?, start_date = ?, end_date = ?, status = ?, reason = ?
    WHERE id = ?
  `);
  stmt.run(
    leave_type ?? existing.leave_type,
    start_date ?? existing.start_date,
    end_date ?? existing.end_date,
    status ?? existing.status,
    reason ?? existing.reason,
    id
  );
  return getLeave(id);
}

export function deleteLeave(id) {
  const result = db.prepare('DELETE FROM leaves WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listApprovedLeavesCoveringDate(date) {
  return db.prepare(`
    SELECT * FROM leaves
    WHERE status = 'approved' AND start_date <= ? AND end_date >= ?
  `).all(date, date);
}

export function listLeavesForDateRange(start, end) {
  return db.prepare(`
    SELECT * FROM leaves
    WHERE status = 'approved' AND start_date <= ? AND end_date >= ?
  `).all(end, start);
}

export function importLeaves(rows) {
  const employees = db.prepare('SELECT id, name FROM employees').all();
  const nameToId = new Map(employees.map((e) => [e.name.toLowerCase().trim(), e.id]));

  const findExisting = db.prepare(
    'SELECT id FROM leaves WHERE employee_id = ? AND start_date = ? AND end_date = ?'
  );
  const updateStatus = db.prepare('UPDATE leaves SET status = ? WHERE id = ?');
  const insertLeave = db.prepare(
    'INSERT INTO leaves (employee_id, leave_type, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)'
  );

  let created = 0;
  let updated = 0;
  const unmatched = [];

  db.exec('BEGIN');
  try {
    for (const { name, dates } of rows) {
      const employeeId = nameToId.get(name.toLowerCase().trim());
      if (!employeeId) {
        unmatched.push(name);
        continue;
      }
      for (const date of dates) {
        const existing = findExisting.get(employeeId, date, date);
        if (existing) {
          updateStatus.run('approved', existing.id);
          updated++;
        } else {
          insertLeave.run(employeeId, 'casual', date, date, 'approved');
          created++;
        }
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { created, updated, unmatched };
}
