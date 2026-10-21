import { get, post } from './client.js';

export function getUndoStatus() {
  return get('/undo');
}

export function undoLastChange() {
  return post('/undo', {});
}

export function redoLastChange() {
  return post('/undo/redo', {});
}
