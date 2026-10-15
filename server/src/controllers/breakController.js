import * as breakService from '../services/breakService.js';

export function listForShift(req, res) {
  res.json(breakService.listBreaksForShift(req.params.shiftId));
}

export function create(req, res) {
  const { shift_id, start_time } = req.body;
  if (!shift_id || !start_time) {
    return res.status(400).json({ error: 'shift_id and start_time are required' });
  }
  res.status(201).json(breakService.createBreak(req.body));
}

export function update(req, res) {
  const brk = breakService.updateBreak(req.params.id, req.body);
  if (!brk) return res.status(404).json({ error: 'Break not found' });
  res.json(brk);
}

export function remove(req, res) {
  const deleted = breakService.deleteBreak(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Break not found' });
  res.status(204).end();
}
