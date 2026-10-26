import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

// Passwords are stored as scrypt hashes, never in plain text.
const USERS = [
  {
    username: 'super admin',
    role: 'super_admin',
    salt: '5d7dd94b55bd64507c53b7079830689d',
    hash: '16488304a179069a7f38337445a800cb546ddadc5650ed4a64a939029cfbb6274a30fa630747cb59774122164c7f05f7ffb6363e3c65e3eae43159f070cb98f6',
  },
  {
    username: 'admin',
    role: 'admin',
    salt: '949cd6f6f2a5c44b51db2b3ff85bec08',
    hash: 'c313090c4eb4f303396c00a989a60443b6787ebd0b17d0a6ab046c3a4069506bd75e34b6dce596e50fb4f1043743f3936785d7470292f7e841294be1941d08d6',
  },
];

// The signing secret lives next to the database so sessions survive server restarts.
function loadSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
  const file = join(dir, 'auth_secret');
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, randomBytes(32).toString('hex'));
  }
  return readFileSync(file, 'utf8').trim();
}

const SECRET = loadSecret();

const sign = (payload) => createHmac('sha256', SECRET).update(payload).digest('base64url');

export function verifyLogin(username, password) {
  const name = String(username ?? '').trim().toLowerCase();
  const user = USERS.find((u) => u.username === name);
  // Hash even for unknown users so response time doesn't reveal which usernames exist.
  const salt = user?.salt ?? '00';
  const actual = scryptSync(String(password ?? ''), salt, 64);
  if (!user) return null;
  const expected = Buffer.from(user.hash, 'hex');
  if (!timingSafeEqual(actual, expected)) return null;
  return { username: user.username, role: user.role };
}

export function issueToken(user) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  const [payload, sig] = String(token ?? '').split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!(data.exp > Date.now())) return null;
    return { username: data.username, role: data.role };
  } catch {
    return null;
  }
}
