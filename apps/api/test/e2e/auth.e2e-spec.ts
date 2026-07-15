import request from 'supertest';
import { WorkspaceRole } from '../../src/generated/prisma/client.js';
import { authHeader, loginAs, loginTokens } from '../helpers/auth.js';
import { describeWithSeededApp } from '../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../helpers/seed-e2e.js';

describeWithSeededApp('Auth (e2e)', (getContext) => {
  it('POST /auth/login sets session cookies without tokens in body', async () => {
    const { app } = getContext();
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'manager@test.local', password: SEED_PASSWORD })
      .expect(200);

    expect(response.body).toEqual({ ok: true });
    expect(response.body.access_token).toBeUndefined();
    expect(response.body.refresh_token).toBeUndefined();
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    const { app } = getContext();
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'manager@test.local', password: 'wrong-password' })
      .expect(401);
  });

  it('POST /auth/register creates account', async () => {
    const { app } = getContext();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'new-user@test.local',
        password: SEED_PASSWORD,
        name: 'New User',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      email: 'new-user@test.local',
      name: 'New User',
      message: expect.any(String),
    });
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('POST /auth/login sets httpOnly cookies for browser clients', async () => {
    const { app } = getContext();
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'manager@test.local', password: SEED_PASSWORD })
      .expect(200);

    const setCookie = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token='),
        expect.stringContaining('refresh_token='),
        expect.stringContaining('HttpOnly'),
      ]),
    );
  });

  it('cookie session requires CSRF header for mutating requests', async () => {
    const { app } = getContext();
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'manager@test.local', password: SEED_PASSWORD })
      .expect(200);

    const setCookie = loginResponse.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const cookieHeader = cookies.map((cookie) => cookie.split(';')[0]).join('; ');

    await request(app.getHttpServer())
      .patch('/auth/me')
      .set('Cookie', cookieHeader)
      .send({ name: 'Manager' })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/auth/me')
      .set('Cookie', cookieHeader)
      .set('X-Requested-With', 'ApproveFlow')
      .send({ name: 'Manager Updated' })
      .expect(200);
  });

  it('POST /auth/refresh via cookie requires CSRF and returns ok without tokens', async () => {
    const { app } = getContext();
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'manager@test.local', password: SEED_PASSWORD })
      .expect(200);

    const setCookie = loginResponse.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const cookieHeader = cookies.map((cookie) => cookie.split(';')[0]).join('; ');

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeader)
      .send({})
      .expect(403);

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeader)
      .set('X-Requested-With', 'ApproveFlow')
      .send({})
      .expect(200);

    expect(response.body).toEqual({ ok: true });
    expect(response.body.access_token).toBeUndefined();
  });

  it('POST /auth/refresh with body token returns rotated tokens', async () => {
    const { app } = getContext();
    const { refreshToken } = await loginTokens(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Requested-With', 'ApproveFlow')
      .send({ refresh_token: refreshToken })
      .expect(200);

    expect(response.body.access_token).toEqual(expect.any(String));
    expect(response.body.refresh_token).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Requested-With', 'ApproveFlow')
      .send({ refresh_token: refreshToken })
      .expect(401);
  });

  it('POST /auth/refresh rejects access token', async () => {
    const { app } = getContext();
    const { accessToken } = await loginTokens(app, 'manager@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Requested-With', 'ApproveFlow')
      .send({ refresh_token: accessToken })
      .expect(401);
  });

  it('GET /projects/:id requires authentication', async () => {
    const { app } = getContext();
    await request(app.getHttpServer()).get(`/projects/${SEED_IDS.project}`).expect(401);
  });

  it('GET /auth/me requires authentication', async () => {
    const { app } = getContext();
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me returns profile and workspace memberships', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toEqual({
      id: SEED_IDS.manager,
      email: 'manager@test.local',
      name: 'Manager',
      workspaces: [
        {
          id: SEED_IDS.workspace,
          name: 'Demo workspace',
          slug: 'demo',
          role: WorkspaceRole.MANAGER,
        },
      ],
    });
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('POST /auth/forgot-password returns generic message', async () => {
    const { app } = getContext();
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'manager@test.local' })
      .expect(200);

    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.resetToken).toEqual(expect.any(String));
  });

  it('POST /auth/reset-password updates password', async () => {
    const { app } = getContext();
    const forgot = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'member@test.local' })
      .expect(200);

    const token = forgot.body.resetToken as string;
    expect(token).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'new-password-123' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member@test.local', password: SEED_PASSWORD })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member@test.local', password: 'new-password-123' })
      .expect(200);
  });
});
