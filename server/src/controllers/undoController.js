import * as undoService from '../services/undoService.js';

export function status(req, res) {
  res.json({ ...undoService.peekLast(), redo: undoService.peekRedo() });
}

export function undo(req, res) {
  const result = undoService.undoLast();
  if (!result) return res.status(404).json({ error: 'Nothing to revert' });
  res.json(result);
}

export function redo(req, res) {
  const result = undoService.redoLast();
  if (!result) return res.status(404).json({ error: 'Nothing to redo' });
  res.json(result);
}
