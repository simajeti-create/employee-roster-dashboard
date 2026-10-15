import * as leaveService from '../services/leaveService.js';

export function list(req, res) {
  const { employee_id, status, start, end } = req.query;
  res.json(leaveService.listLeaves({ employee_id, status, start, end }));
}

export function get(req, res) {
  const leave = leaveService.getLeave(req.params.id);
  if (!leave) return res.status(404).json({ error: 'Leave not found' });
  res.json(leave);
}

export function create(req, res) {
  const { employee_id, leave_type, start_date, end_date } = req.body;
  if (!employee_id || !leave_type || !start_date || !end_date) {
    return res.status(400).json({ error: 'employee_id, leave_type, start_date, and end_date are required' });
  }
  res.status(201).json(leaveService.createLeave(req.body));
}

export function update(req, res) {
  const leave = leaveService.updateLeave(req.params.id, req.body);
  if (!leave) return res.status(404).json({ error: 'Leave not found' });
  res.json(leave);
}

export function remove(req, res) {
  const deleted = leaveService.deleteLeave(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Leave not found' });
  res.status(204).end();
}

export function importLeaves(req, res) {
  const { rows } = req.body;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: 'rows must be an array' });
  }
  res.json(leaveService.importLeaves(rows));
}
