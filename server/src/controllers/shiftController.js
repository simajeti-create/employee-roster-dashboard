import * as shiftService from '../services/shiftService.js';

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
  res.status(201).json(shiftService.createShift(req.body));
}

export function update(req, res) {
  const shift = shiftService.updateShift(req.params.id, req.body);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  res.json(shift);
}

export function remove(req, res) {
  const deleted = shiftService.deleteShift(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Shift not found' });
  res.status(204).end();
}
