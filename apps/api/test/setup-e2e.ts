import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../.env.test') });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.test.example to .env.test and create the test database.',
  );
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret';
}
