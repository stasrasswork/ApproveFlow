import request from 'supertest';
import { describeWithApp } from '../helpers/seeded-app.js';

describe('Auth throttling (e2e)', () => {
  const previous = process.env.E2E_ENABLE_THROTTLE;

  beforeAll(() => {
    process.env.E2E_ENABLE_THROTTLE = 'true';
  });

  afterAll(() => {
    if (previous === undefined) {
      delete process.env.E2E_ENABLE_THROTTLE;
    } else {
      process.env.E2E_ENABLE_THROTTLE = previous;
    }
  });

  describeWithApp('with throttling enabled', (getContext) => {
    it('returns 429 after many login requests from same client', async () => {
      const { app } = getContext();
      let sawRateLimit = false;

      for (let index = 0; index < 20; index += 1) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'missing@test.local', password: 'wrong-password' });

        if (response.status === 429) {
          sawRateLimit = true;
          break;
        }
      }

      expect(sawRateLimit).toBe(true);
    });
  });
});
