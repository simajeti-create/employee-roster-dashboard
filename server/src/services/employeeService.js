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

export function createEmployee({ name, department, role, default_shift_start, default_shift_end, employment_status, email, project_name, employee_code, business, offering_portfolio, service_offering, project_wbs }) {
  const stmt = db.prepare(`
    INSERT INTO employees (name, department, role, default_shift_start, default_shift_end, employment_status, email, project_name, employee_code, business, offering_portfolio, service_offering, project_wbs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    employee_code || null,
    business || null,
    offering_portfolio || null,
    service_offering || null,
    project_wbs || null
  );
  return getEmployee(Number(result.lastInsertRowid));
}

export function updateEmployee(id, { name, department, role, default_shift_start, default_shift_end, employment_status, email, project_name, employee_code, business, offering_portfolio, service_offering, project_wbs }) {
  const existing = getEmployee(id);
  if (!existing) return null;
  const stmt = db.prepare(`
    UPDATE employees
    SET name = ?, department = ?, role = ?, default_shift_start = ?, default_shift_end = ?, employment_status = ?, email = ?, project_name = ?, employee_code = ?, business = ?, offering_portfolio = ?, service_offering = ?, project_wbs = ?
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
    business !== undefined ? business || null : existing.business,
    offering_portfolio !== undefined ? offering_portfolio || null : existing.offering_portfolio,
    service_offering !== undefined ? service_offering || null : existing.service_offering,
    project_wbs !== undefined ? project_wbs || null : existing.project_wbs,
    id
  );
  return getEmployee(id);
}

export function deleteEmployee(id) {
  const result = db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  return result.changes > 0;
}

// Fields an import sheet can carry. A column present in the sheet is authoritative: a filled
// cell sets the value, an empty cell clears it (except name, Emp No. and email). A column missing from the sheet is left alone.
const IMPORT_FIELDS = [
  'employee_code', 'email', 'name', 'business', 'offering_portfolio', 'service_offering', 'project_name', 'project_wbs',
];

const clean = (v) => String(v ?? '').trim();

// Bulk import: rows are matched on Emp No., then on email. Existing people are reconciled with
// the sheet (only the fields that differ are written); new people are created with placeholder
// department/role. People missing from the sheet are never removed.
export function importEmployees(rows) {
  const result = { created: 0, updated: 0, unchanged: 0, skipped: [], changes: [] };
  const seenCodes = new Set();
  const seenEmails = new Set();

  const byCode = db.prepare('SELECT * FROM employees WHERE employee_code = ?');
  const byEmail = db.prepare('SELECT * FROM employees WHERE lower(email) = ?');
  const insert = db.prepare(`
    INSERT INTO employees (name, department, role, employment_status, employee_code, email, business,
                           offering_portfolio, service_offering, project_name, project_wbs)
    VALUES (?, 'Unassigned', 'Employee', 'active', ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    rows.forEach((row, i) => {
      const line = i + 2; // spreadsheet row, counting the header
      const present = IMPORT_FIELDS.filter((f) => f in row);
      const val = Object.fromEntries(present.map((f) => [f, clean(row[f])]));
      const code = val.employee_code ?? '';
      const email = val.email ?? '';
      const label = val.name || code || email || '(blank)';
      const skip = (reason) => result.skipped.push({ line, name: label, reason });

      if (!code && !email) return skip('Needs an Emp No. or an Email ID to identify the employee');
      if (email && !email.includes('@')) return skip('Invalid email');
      const lowerEmail = email.toLowerCase();
      if ((code && seenCodes.has(code)) || (email && seenEmails.has(lowerEmail))) return skip('Duplicate in file');
      if (code) seenCodes.add(code);
      if (email) seenEmails.add(lowerEmail);

      const byCodeRow = code ? byCode.get(code) : undefined;
      const byEmailRow = email ? byEmail.get(lowerEmail) : undefined;
      const existing = byCodeRow ?? byEmailRow;

      if (!existing) {
        if (!val.name) return skip('Name is required for a new employee');
        insert.run(
          val.name, code || null, email || null, val.business || null, val.offering_portfolio || null,
          val.service_offering || null, val.project_name || null, val.project_wbs || null
        );
        result.created++;
        return;
      }

      // The other identifier must not already belong to a different person.
      const clash = [byCodeRow, byEmailRow].find((e) => e && e.id !== existing.id);
      if (clash) return skip(`Emp No. and email belong to different people (${clash.name})`);

      const changed = {};
      for (const f of present) {
        // Name, Emp No. and email identify the person, so a blank cell never clears them.
        if ((f === 'name' || f === 'employee_code' || f === 'email') && !val[f]) continue;
        const next = val[f] || null;
        const same = f === 'email'
          ? (existing.email ?? '').toLowerCase() === (next ?? '').toLowerCase()
          : (existing[f] ?? null) === next;
        if (!same) changed[f] = next;
      }
      const fields = Object.keys(changed);
      if (fields.length === 0) {
        result.unchanged++;
        return;
      }
      db.prepare(`UPDATE employees SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`)
        .run(...fields.map((f) => changed[f]), existing.id);
      result.updated++;
      result.changes.push({ name: changed.name ?? existing.name, fields });
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return result;
}
