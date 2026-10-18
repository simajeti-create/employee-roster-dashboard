import * as breakService from '../services/breakService.js';
import { withUndo, shiftKey } from '../services/undoService.js';

function undoKeys(shiftId) {
  const key = shiftKey(shiftId);
  return key ? [key] : [];
}

export function listForShift(req, res) {
  res.json(breakService.listBreaksForShift(req.params.shiftId));
}

export function create(req, res) {
  const { shift_id, start_time } = req.body;
  if (!shift_id || !start_time) {
    return res.status(400).json({ error: 'shift_id and start_time are required' });
  }
  const created = withUndo('Added break', undoKeys(shift_id), () => breakService.createBreak(req.body));
  res.status(201).json(created);
}

export function update(req, res) {
  const current = breakService.getBreak(req.params.id);
  if (!current) return res.status(404).json({ error: 'Break not found' });
  const brk = withUndo('Edited break', undoKeys(current.shift_id), () => breakService.updateBreak(req.params.id, req.body));
  res.json(brk);
}

export function remove(req, res) {
  const current = breakService.getBreak(req.params.id);
  if (!current) return res.status(404).json({ error: 'Break not found' });
  withUndo('Deleted break', undoKeys(current.shift_id), () => breakService.deleteBreak(req.params.id));
  res.status(204).end();
}
