import { getCurrentlyActive } from '../services/activeService.js';

export function get(req, res) {
  res.json(getCurrentlyActive());
}
