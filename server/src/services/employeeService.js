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

export function createEmployee({ name, department, role, default_shift_start, default_shift_end, employment_status, email, project_name }) {
  const stmt = db.prepare(`
    INSERT INTO employees (name, department, role, default_shift_start, default_shift_end, employment_status, email, project_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    name,
    department,
    role,
    default_shift_start ?? null,
    default_shift_end ?? null,
    employment_status ?? 'active',
    email ?? null,
    project_name ?? null
  );
  return getEmployee(Number(result.lastInsertRowid));
}

export function updateEmployee(id, { name, department, role, default_shift_start, default_shift_end, employment_status, email, project_name }) {
  const existing = getEmployee(id);
  if (!existing) return null;
  const stmt = db.prepare(`
    UPDATE employees
    SET name = ?, department = ?, role = ?, default_shift_start = ?, default_shift_end = ?, employment_status = ?, email = ?, project_name = ?
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
    id
  );
  return getEmployee(id);
}

export function deleteEmployee(id) {
  const result = db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  return result.changes > 0;
}
