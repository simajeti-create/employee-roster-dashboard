import { importRoster } from '../services/rosterImportService.js';
import * as shiftService from '../services/shiftService.js';
import { withUndo } from '../services/undoService.js';

export function list(req, res) {
  const { start, end, employee_id } = req.query;
  res.json(shiftService.listShifts({ start, end, employee_id }));
}

export function get(req, res) {
  const shift = shiftService.getShift(req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  res.json(shift);
}

export function create(req, res) {
  const { employee_id, work_date, start_time, end_time } = req.body;
  if (!employee_id || !work_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'employee_id, work_date, start_time, and end_time are required' });
  }
  const existing = shiftService.getShiftByEmployeeAndDate(employee_id, work_date);
  if (existing) {
    return res.status(409).json({ error: 'A shift already exists for this employee on this date' });
  }
  const created = withUndo(
    `Added shift on ${work_date}`,
    [{ employee_id, work_date }],
    () => shiftService.createShift(req.body)
  );
  res.status(201).json(created);
}

export function update(req, res) {
  const current = shiftService.getShift(req.params.id);
  if (!current) return res.status(404).json({ error: 'Shift not found' });
  const keys = [{ employee_id: current.employee_id, work_date: current.work_date }];
  if (req.body.work_date && req.body.work_date !== current.work_date) {
    keys.push({ employee_id: current.employee_id, work_date: req.body.work_date });
  }
  const shift = withUndo(`Edited shift on ${current.work_date}`, keys, () => shiftService.updateShift(req.params.id, req.body));
  res.json(shift);
}

export function remove(req, res) {
  const current = shiftService.getShift(req.params.id);
  const deleted = current
    ? withUndo(
        `Deleted shift on ${current.work_date}`,
        [{ employee_id: current.employee_id, work_date: current.work_date }],
        () => shiftService.deleteShift(req.params.id)
      )
    : false;
  if (!deleted) return res.status(404).json({ error: 'Shift not found' });
  res.status(204).end();
}

export function bulkSet(req, res) {
  const { employee_id, start, end, start_time, end_time } = req.body;
  if (!employee_id || !start || !end || !start_time || !end_time) {
    return res.status(400).json({ error: 'employee_id, start, end, start_time, and end_time are required' });
  }
  if (start > end) {
    return res.status(400).json({ error: 'From date must not be after to date' });
  }
  res.json(shiftService.bulkSetShifts(req.body));
}

export function applyDefaults(req, res) {
  const { start, end, employee_ids } = req.body;
  if (!start || !end || start > end) {
    return res.status(400).json({ error: 'start and end are required, and start must not be after end' });
  }
  res.json(shiftService.applyDefaultShifts({ start, end, employee_ids }));
}

const HHMM = /^\d{2}:\d{2}$/;

export function importRosterSheet(req, res) {
  const { year, month, s1, s2, rows } = req.body;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'A valid year and month are required' });
  }
  if (![s1, s2].every((t) => t && HHMM.test(t.start) && HHMM.test(t.end))) {
    return res.status(400).json({ error: 'S1 and S2 need start and end times (HH:MM)' });
  }
  if (s2.start < '17:30') {
    return res.status(400).json({ error: 'S2 must start at 17:30 or later, otherwise it will not count towards NSA' });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows must be a non-empty array' });
  }
  res.json(importRoster({ year, month, s1, s2, rows }));
}
