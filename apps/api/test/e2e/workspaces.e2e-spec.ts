import request from 'supertest';
import { WorkspaceRole } from '../../src/generated/prisma/client.js';
import { authHeader, loginAs } from '../helpers/auth.js';
import { describeWithSeededApp } from '../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../helpers/seed-e2e.js';

describeWithSeededApp('Workspaces (e2e)', (getContext) => {
  it('GET /workspaces returns memberships with role', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get('/workspaces')
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        id: SEED_IDS.workspace,
        name: 'Demo workspace',
        slug: 'demo',
        role: WorkspaceRole.MANAGER,
      }),
    ]);
  });

  it('GET /workspaces/:id returns workspace for member', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'admin@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get(`/workspaces/${SEED_IDS.workspace}`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toMatchObject({
      id: SEED_IDS.workspace,
      slug: 'demo',
      role: WorkspaceRole.ADMIN,
    });
  });

  it('GET /workspaces/:id rejects non-member', async () => {
    const { app } = getContext();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'outsider@test.local',
        password: SEED_PASSWORD,
        name: 'Outsider',
      })
      .expect(201);

    const token = await loginAs(app, 'outsider@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .get(`/workspaces/${SEED_IDS.workspace}`)
      .set(authHeader(token))
      .expect(403);
  });

  it('POST /workspaces creates workspace and assigns admin role', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .post('/workspaces')
      .set(authHeader(token))
      .send({ name: 'Second agency', slug: 'second-agency' })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Second agency',
      slug: 'second-agency',
    });

    const memberships = await request(app.getHttpServer())
      .get('/workspaces')
      .set(authHeader(token))
      .expect(200);

    expect(memberships.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'second-agency',
          role: WorkspaceRole.ADMIN,
        }),
      ]),
    );
  });

  it('PATCH /workspaces/:id allows admin and rejects manager', async () => {
    const { app } = getContext();
    const adminToken = await loginAs(app, 'admin@test.local', SEED_PASSWORD);
    const managerToken = await loginAs(
      app,
      'manager@test.local',
      SEED_PASSWORD,
    );

    const updated = await request(app.getHttpServer())
      .patch(`/workspaces/${SEED_IDS.workspace}`)
      .set(authHeader(adminToken))
      .send({ name: 'Renamed workspace' })
      .expect(200);

    expect(updated.body.name).toBe('Renamed workspace');

    const slugUpdated = await request(app.getHttpServer())
      .patch(`/workspaces/${SEED_IDS.workspace}`)
      .set(authHeader(adminToken))
      .send({ slug: 'demo-renamed' })
      .expect(200);

    expect(slugUpdated.body.slug).toBe('demo-renamed');

    await request(app.getHttpServer())
      .patch(`/workspaces/${SEED_IDS.workspace}`)
      .set(authHeader(managerToken))
      .send({ name: 'Blocked rename' })
      .expect(403);
  });

  it('GET /workspaces/:id/members lists workspace members', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get(`/workspaces/${SEED_IDS.workspace}/members`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toHaveLength(4);
    expect(response.body.map((member: { user: { email: string } }) => member.user.email)).toEqual(
      expect.arrayContaining([
        'admin@test.local',
        'manager@test.local',
        'client@test.local',
        'member@test.local',
      ]),
    );
  });

  it('POST /workspaces/:id/members invites registered user', async () => {
    const { app } = getContext();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'invitee@test.local',
        password: SEED_PASSWORD,
        name: 'Invitee',
      })
      .expect(201);

    const adminToken = await loginAs(app, 'admin@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/members`)
      .set(authHeader(adminToken))
      .send({ email: 'invitee@test.local', role: WorkspaceRole.MEMBER })
      .expect(201);

    expect(response.body).toMatchObject({
      role: WorkspaceRole.MEMBER,
      user: {
        email: 'invitee@test.local',
        name: 'Invitee',
      },
    });
  });

  it('POST /workspaces/:id/members rejects admin role from manager', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(
      app,
      'manager@test.local',
      SEED_PASSWORD,
    );

    await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/members`)
      .set(authHeader(managerToken))
      .send({ email: 'member@test.local', role: WorkspaceRole.ADMIN })
      .expect(403);
  });

  it('PATCH /workspaces/:id/members/:userId updates role for admin', async () => {
    const { app } = getContext();
    const adminToken = await loginAs(app, 'admin@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .patch(`/workspaces/${SEED_IDS.workspace}/members/${SEED_IDS.member}`)
      .set(authHeader(adminToken))
      .send({ role: WorkspaceRole.MANAGER })
      .expect(200);

    expect(response.body.role).toBe(WorkspaceRole.MANAGER);
  });
});
