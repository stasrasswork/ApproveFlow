import { MailService } from './mail.service.js';

describe('MailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports unconfigured SMTP', () => {
    const service = new MailService();

    expect(service.isConfigured()).toBe(false);
  });

  it('reports configured SMTP', () => {
    process.env.SMTP_HOST = 'smtp.test.local';
    process.env.SMTP_FROM = 'noreply@test.local';
    const service = new MailService();

    expect(service.isConfigured()).toBe(true);
  });

  it('returns false without sending when SMTP is not configured', async () => {
    const service = new MailService();

    const sent = await service.send({
      to: 'user@test.local',
      subject: 'Hello',
      text: 'Body',
    });

    expect(sent).toBe(false);
  });

  it('builds app URLs from APP_URL', () => {
    process.env.APP_URL = 'https://app.test/';
    const service = new MailService();

    expect(service.appUrl('/reset-password')).toBe(
      'https://app.test/reset-password',
    );
  });
});
