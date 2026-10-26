import { verifyToken } from '../services/authService.js';

// Admins are view-only apart from the Excel imports; super admins can do everything.
const ADMIN_WRITABLE = new Set(['/employees/import', '/shifts/import-roster', '/leaves/import']);

export function requireWriteAccess(req, res, next) {
  if (req.user.role === 'admin' && req.method !== 'GET' && !ADMIN_WRITABLE.has(req.path)) {
    return res.status(403).json({ error: 'View-only access: only super admins can make this change' });
  }
  next();
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const user = header.startsWith('Bearer ') ? verifyToken(header.slice(7)) : null;
  if (!user) return res.status(401).json({ error: 'Please sign in' });
  req.user = user;
  next();
}
