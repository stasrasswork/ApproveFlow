function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set when NODE_ENV=production');
  }

  return 'dev-secret-change-me';
}

export const JWT_SECRET = resolveJwtSecret();
