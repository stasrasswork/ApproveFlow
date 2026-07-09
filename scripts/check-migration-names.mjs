import { readdir } from 'node:fs/promises';
import path from 'node:path';

const migrationsDir = path.resolve('apps/api/prisma/migrations');
const allowedLegacy = new Set(['20260708181927_1']);
const validName = /^\d{14}_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const trailingOrdinal = /_\d+$/;

const entries = await readdir(migrationsDir, { withFileTypes: true });
const invalid = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => !allowedLegacy.has(name))
  .filter((name) => !validName.test(name) || trailingOrdinal.test(name));

if (invalid.length > 0) {
  console.error('Invalid migration directory names found:');
  for (const name of invalid) {
    console.error(` - ${name}`);
  }
  console.error(
    'Expected pattern: YYYYMMDDHHMMSS_<verb>_<domain>_<purpose> (lowercase snake_case)',
  );
  process.exit(1);
}

console.log('Migration naming policy check passed.');
