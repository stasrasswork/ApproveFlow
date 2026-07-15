import request from 'supertest';
import { authHeader, loginTokens } from '../helpers/auth.js';
import { describeWithSeededApp } from '../helpers/seeded-app.js';
import { SEED_PASSWORD } from '../helpers/seed-e2e.js';

describeWithSeededApp('Auth session revocation (e2e)', (getContext) => {
  it('logout invalidates existing access and refresh tokens', async () => {
    const { app } = getContext();
    const email = 'revocation-user@test.local';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: SEED_PASSWORD, name: 'Revocation User' })
      .expect(201);

    const tokens = await loginTokens(app, email, SEED_PASSWORD);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set(authHeader(tokens.accessToken))
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set(authHeader(tokens.accessToken))
      .expect(204);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set(authHeader(tokens.accessToken))
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Requested-With', 'ApproveFlow')
      .send({ refresh_token: tokens.refreshToken })
      .expect(401);

    const newTokens = await loginTokens(app, email, SEED_PASSWORD);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set(authHeader(newTokens.accessToken))
      .expect(200);
  });
});
