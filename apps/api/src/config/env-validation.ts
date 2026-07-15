const WEAK_JWT_SECRETS = new Set([
  'change-me-in-production',
  'replace-with-long-random-string-min-32-chars',
  'ci-test-secret',
  'test-secret',
]);

export function isWeakJwtSecret(secret: string | undefined): boolean {
  if (!secret || secret.length < 32) {
    return true;
  }
  if (WEAK_JWT_SECRETS.has(secret)) {
    return true;
  }
  return /^replace-with/i.test(secret) || /^change-me/i.test(secret);
}

export function isLocalAppUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function isSmtpConfigured(values: {
  SMTP_HOST?: string;
  SMTP_FROM?: string;
}): boolean {
  return Boolean(values.SMTP_HOST?.trim() && values.SMTP_FROM?.trim());
}

export function smtpRequiredForProduction(appUrl: string): boolean {
  return !isLocalAppUrl(appUrl);
}
