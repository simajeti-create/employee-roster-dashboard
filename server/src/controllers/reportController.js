import { getWeeklySummary, getNsaReport } from '../services/reportService.js';

export function weekly(req, res) {
  res.json(getWeeklySummary(req.query.week_start));
}

export function nsa(req, res) {
  res.json(getNsaReport({ start: req.query.start, end: req.query.end }));
}
