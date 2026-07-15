#!/usr/bin/env node
/**
 * Validates .env.prod before docker compose deploy.
 * Exits 0 when ready for local prod-smoke; warns on optional gaps.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILE = process.env.ENV_FILE ?? '.env.prod';
const path = resolve(ENV_FILE);

if (!existsSync(path)) {
  console.error(`Missing ${ENV_FILE}. Run: bash scripts/ops/prod-up-fresh.sh`);
  process.exit(1);
}

const lines = readFileSync(path, 'utf8').split('\n');
const env = Object.fromEntries(
  lines
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      if (idx === -1) return [line.trim(), ''];
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const errors = [];
const warnings = [];

const weakJwt =
  !env.JWT_SECRET ||
  env.JWT_SECRET.length < 32 ||
  /^replace-with/i.test(env.JWT_SECRET) ||
  /^change-me/i.test(env.JWT_SECRET);

if (weakJwt) {
  errors.push('JWT_SECRET is missing or still a placeholder (need ≥32 chars)');
}

if (
  !env.POSTGRES_PASSWORD ||
  /^replace-with/i.test(env.POSTGRES_PASSWORD)
) {
  errors.push('POSTGRES_PASSWORD is missing or still a placeholder');
}

if (!env.CORS_ORIGIN?.trim()) {
  errors.push('CORS_ORIGIN is required');
}

if (!env.APP_URL?.trim()) {
  errors.push('APP_URL is required');
}

try {
  new URL(env.APP_URL ?? '');
} catch {
  errors.push('APP_URL must be a valid URL');
}

if (env.EXPOSE_DEBUG_TOKENS === 'true') {
  errors.push('EXPOSE_DEBUG_TOKENS must be false in production');
}

const isLocal =
  env.APP_URL?.includes('localhost') || env.APP_URL?.includes('127.0.0.1');

const smtpPlaceholder =
  !env.SMTP_HOST?.trim() ||
  env.SMTP_HOST.includes('example.com') ||
  !env.SMTP_FROM?.trim() ||
  env.SMTP_FROM.includes('example.com');

if (!isLocal && smtpPlaceholder) {
  errors.push(
    'SMTP_HOST and SMTP_FROM are required for non-localhost APP_URL',
  );
} else if (smtpPlaceholder) {
  warnings.push(
    'SMTP not configured — password reset and invite emails will not send (OK for local smoke)',
  );
}

if (!env.REDIS_URL?.trim()) {
  warnings.push('REDIS_URL unset — rate limiting is in-memory (single API instance only)');
}

if (errors.length > 0) {
  console.error(`\n${ENV_FILE} validation failed:\n`);
  for (const err of errors) {
    console.error(`  ✗ ${err}`);
  }
  console.error('\nFix: bash scripts/ops/prod-up-fresh.sh --regenerate-secrets\n');
  process.exit(1);
}

console.log(`${ENV_FILE} validation passed.`);
for (const warn of warnings) {
  console.warn(`  ⚠ ${warn}`);
}
