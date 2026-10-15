import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, 'roster.db'));
db.exec('PRAGMA foreign_keys = ON');

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Column migrations — safe to re-run; SQLite throws if column already exists
try { db.exec('ALTER TABLE employees ADD COLUMN email TEXT'); } catch {}
try { db.exec('ALTER TABLE employees ADD COLUMN project_name TEXT'); } catch {}

export default db;
