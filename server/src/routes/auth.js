import { Router } from 'express';
import { issueToken, verifyLogin } from '../services/authService.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Throttle guessing: 5 failed attempts per IP locks login for a minute.
const failures = new Map();
const MAX_FAILS = 5;
const LOCK_MS = 60 * 1000;

router.post('/login', (req, res) => {
  const ip = req.ip;
  const entry = failures.get(ip);
  if (entry && entry.count >= MAX_FAILS && Date.now() - entry.last < LOCK_MS) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
  }

  const user = verifyLogin(req.body?.username, req.body?.password);
  if (!user) {
    failures.set(ip, { count: (entry && Date.now() - entry.last < LOCK_MS ? entry.count : 0) + 1, last: Date.now() });
    return res.status(401).json({ error: 'Incorrect username or password' });
  }
  failures.delete(ip);
  res.json({ token: issueToken(user), user });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
