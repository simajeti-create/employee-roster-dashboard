import { getWeeklySummary, getRangeSummary, getNsaReport } from '../services/reportService.js';

export function weekly(req, res) {
  res.json(getWeeklySummary(req.query.week_start));
}

export function nsa(req, res) {
  res.json(getNsaReport({ start: req.query.start, end: req.query.end }));
}

export function summary(req, res) {
  const { start, end } = req.query;
  if (!start || !end || start > end) {
    return res.status(400).json({ error: 'start and end are required, and start must not be after end' });
  }
  res.json(getRangeSummary({ start, end }));
}
