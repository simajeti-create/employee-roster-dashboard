import db from '../db/connection.js';

export function listEmployees({ department, employment_status } = {}) {
  let sql = 'SELECT * FROM employees WHERE 1=1';
  const params = [];
  if (department) {
    sql += ' AND department = ?';
    params.push(department);
  }
  if (employment_status) {
    sql += ' AND employment_status = ?';
    params.push(employment_status);
  }
  sql += ' ORDER BY name';
  return db.prepare(sql).all(...params);
}

export function getEmployee(id) {
  return db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
}

export function createEmployee({ name, department, role, default_shift_start, default_shift_end, employment_status, email, project_name, employee_code }) {
  const stmt = db.prepare(`
    INSERT INTO employees (name, department, role, default_shift_start, default_shift_end, employment_status, email, project_name, employee_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    name,
    department,
    role,
    default_shift_start ?? null,
    default_shift_end ?? null,
    employment_status ?? 'active',
    email ?? null,
    project_name ?? null,
    employee_code || null
  );
  return getEmployee(Number(result.lastInsertRowid));
}

export function updateEmployee(id, { name, department, role, default_shift_start, default_shift_end, employment_status, email, project_name, employee_code }) {
  const existing = getEmployee(id);
  if (!existing) return null;
  const stmt = db.prepare(`
    UPDATE employees
    SET name = ?, department = ?, role = ?, default_shift_start = ?, default_shift_end = ?, employment_status = ?, email = ?, project_name = ?, employee_code = ?
    WHERE id = ?
  `);
  stmt.run(
    name ?? existing.name,
    department ?? existing.department,
    role ?? existing.role,
    default_shift_start ?? existing.default_shift_start,
    default_shift_end ?? existing.default_shift_end,
    employment_status ?? existing.employment_status,
    email !== undefined ? email : existing.email,
    project_name !== undefined ? project_name : existing.project_name,
    employee_code !== undefined ? employee_code || null : existing.employee_code,
    id
  );
  return getEmployee(id);
}

export function deleteEmployee(id) {
  const result = db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  return result.changes > 0;
}

// Bulk import from a spreadsheet: rows are matched on Employee ID, then on email. Existing
// people get their name/email/ID refreshed (department, role and shifts are left alone);
// new people are created with placeholder department/role to be filled in later.
export function importEmployees(rows) {
  const result = { created: 0, updated: 0, skipped: [] };
  const seenCodes = new Set();
  const seenEmails = new Set();

  const byCode = db.prepare('SELECT * FROM employees WHERE employee_code = ?');
  const byEmail = db.prepare('SELECT * FROM employees WHERE lower(email) = ?');
  const insert = db.prepare(`
    INSERT INTO employees (name, department, role, employment_status, email, employee_code)
    VALUES (?, 'Unassigned', 'Employee', 'active', ?, ?)
  `);
  const update = db.prepare('UPDATE employees SET name = ?, email = ?, employee_code = ? WHERE id = ?');

  db.exec('BEGIN');
  try {
    rows.forEach((row, i) => {
      const line = i + 2; // spreadsheet row, counting the header
      const name = String(row.name ?? '').trim();
      const email = String(row.email ?? '').trim();
      const code = String(row.employee_code ?? '').trim();
      const skip = (reason) => result.skipped.push({ line, name: name || code || email || '(blank)', reason });

      if (!name || !email || !code) return skip('Name, Deloitte Email ID and Employee ID are all required');
      if (!email.includes('@')) return skip('Invalid email');
      const lowerEmail = email.toLowerCase();
      if (seenCodes.has(code) || seenEmails.has(lowerEmail)) return skip('Duplicate in file');
      seenCodes.add(code);
      seenEmails.add(lowerEmail);

      const existing = byCode.get(code) ?? byEmail.get(lowerEmail);
      if (!existing) {
        insert.run(name, email, code);
        result.created++;
        return;
      }
      // Updating must not collide with a different person who owns the other identifier.
      const clash = [byCode.get(code), byEmail.get(lowerEmail)].find((e) => e && e.id !== existing.id);
      if (clash) return skip(`Employee ID and email belong to different people (${clash.name})`);
      update.run(name, email, code, existing.id);
      result.updated++;
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return result;
}
