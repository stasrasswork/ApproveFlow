import {
  isLocalAppUrl,
  isSmtpConfigured,
  isWeakJwtSecret,
  smtpRequiredForProduction,
} from './env-validation.js';

describe('env-validation', () => {
  describe('isWeakJwtSecret', () => {
    it('rejects placeholders and short secrets', () => {
      expect(isWeakJwtSecret(undefined)).toBe(true);
      expect(isWeakJwtSecret('short')).toBe(true);
      expect(isWeakJwtSecret('replace-with-long-random-string-min-32-chars')).toBe(
        true,
      );
      expect(isWeakJwtSecret('change-me-in-production')).toBe(true);
    });

    it('accepts strong secrets', () => {
      expect(
        isWeakJwtSecret('a'.repeat(32)),
      ).toBe(false);
    });
  });

  describe('isLocalAppUrl', () => {
    it('detects localhost URLs', () => {
      expect(isLocalAppUrl('http://localhost:8080')).toBe(true);
      expect(isLocalAppUrl('http://127.0.0.1:8080')).toBe(true);
      expect(isLocalAppUrl('https://app.example.com')).toBe(false);
    });
  });

  describe('smtpRequiredForProduction', () => {
    it('requires SMTP for public URLs only', () => {
      expect(smtpRequiredForProduction('http://localhost:8080')).toBe(false);
      expect(smtpRequiredForProduction('https://app.example.com')).toBe(true);
    });
  });

  describe('isSmtpConfigured', () => {
    it('checks host and from', () => {
      expect(isSmtpConfigured({})).toBe(false);
      expect(
        isSmtpConfigured({ SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'x@y.com' }),
      ).toBe(true);
    });
  });
});
