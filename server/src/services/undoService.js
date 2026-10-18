import db from '../db/connection.js';

const MAX_STEPS = 50;

// Each undo step stores what the affected (employee, date) shifts looked like *before* a
// change, breaks included. Undoing replaces whatever is there now with that snapshot.
export function snapshot(keys) {
  const seen = new Set();
  const entries = [];
  for (const { employee_id, work_date } of keys) {
    const id = `${employee_id}|${work_date}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const shift = db
      .prepare('SELECT * FROM shifts WHERE employee_id = ? AND work_date = ?')
      .get(employee_id, work_date) ?? null;
    const breaks = shift ? db.prepare('SELECT * FROM breaks WHERE shift_id = ?').all(shift.id) : [];
    entries.push({
      employee_id,
      work_date,
      shift: shift && { ...shift },
      breaks: breaks.map((b) => ({ ...b })),
    });
  }
  return entries;
}

export function record(label, before) {
  if (before.length === 0) return;
  db.prepare('INSERT INTO undo_log (label, before_json) VALUES (?, ?)').run(label, JSON.stringify(before));
  db.prepare(`DELETE FROM undo_log WHERE id NOT IN (SELECT id FROM undo_log ORDER BY id DESC LIMIT ${MAX_STEPS})`).run();
}

// Runs a single mutation and records an undo step for it.
export function withUndo(label, keys, fn) {
  const before = snapshot(keys);
  const result = fn();
  record(label, before);
  return result;
}

export function shiftKey(shiftId) {
  return db.prepare('SELECT employee_id, work_date FROM shifts WHERE id = ?').get(shiftId) ?? null;
}

export function peekLast() {
  const row = db.prepare('SELECT id, label, created_at FROM undo_log ORDER BY id DESC LIMIT 1').get();
  return row ? { available: true, label: row.label, created_at: row.created_at } : { available: false };
}

export function undoLast() {
  const row = db.prepare('SELECT * FROM undo_log ORDER BY id DESC LIMIT 1').get();
  if (!row) return null;
  const before = JSON.parse(row.before_json);

  const delShift = db.prepare('DELETE FROM shifts WHERE employee_id = ? AND work_date = ?');
  const insShift = db.prepare(
    'INSERT INTO shifts (id, employee_id, work_date, start_time, end_time, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insBreak = db.prepare('INSERT INTO breaks (id, shift_id, start_time, end_time) VALUES (?, ?, ?, ?)');

  db.exec('BEGIN');
  try {
    for (const e of before) delShift.run(e.employee_id, e.work_date);
    for (const e of before) {
      if (!e.shift) continue;
      const s = e.shift;
      insShift.run(s.id, s.employee_id, s.work_date, s.start_time, s.end_time, s.notes, s.created_at);
      for (const b of e.breaks) insBreak.run(b.id, b.shift_id, b.start_time, b.end_time);
    }
    db.prepare('DELETE FROM undo_log WHERE id = ?').run(row.id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { label: row.label, days: before.length };
}
