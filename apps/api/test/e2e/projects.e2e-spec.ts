import request from 'supertest';
import { WorkspaceRole } from '../../src/generated/prisma/client.js';
import { authHeader, loginAs } from '../helpers/auth.js';
import { describeWithSeededApp } from '../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../helpers/seed-e2e.js';

describeWithSeededApp('Projects (e2e)', (getContext) => {
  it('GET /workspaces/:id/projects returns projects for manager', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get(`/workspaces/${SEED_IDS.workspace}/projects`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: SEED_IDS.project,
          name: 'Demo project',
        }),
      ]),
    );
  });

  it('GET /workspaces/:id/projects returns only invited projects for client', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'client@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get(`/workspaces/${SEED_IDS.workspace}/projects`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(SEED_IDS.project);
  });

  it('POST /workspaces/:id/projects creates project for manager', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/projects`)
      .set(authHeader(token))
      .send({ name: 'New campaign', description: 'Q2 launch' })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'New campaign',
      description: 'Q2 launch',
      workspaceId: SEED_IDS.workspace,
    });
  });

  it('POST /workspaces/:id/projects rejects member', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/projects`)
      .set(authHeader(token))
      .send({ name: 'Blocked project' })
      .expect(403);
  });

  it('GET /projects/:id returns project details', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get(`/projects/${SEED_IDS.project}`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toMatchObject({
      id: SEED_IDS.project,
      name: 'Demo project',
    });
  });

  it('PUT /projects/:id updates project for manager', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .put(`/projects/${SEED_IDS.project}`)
      .set(authHeader(token))
      .send({ name: 'Updated project', description: 'New description' })
      .expect(200);

    expect(response.body).toMatchObject({
      id: SEED_IDS.project,
      name: 'Updated project',
      description: 'New description',
    });
  });

  it('GET /projects/:id/stats returns task aggregates', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get(`/projects/${SEED_IDS.project}/stats`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toMatchObject({
      clientHandoff: expect.any(Number),
      clientApproval: expect.any(Number),
      notDone: expect.any(Number),
      overdueDue: expect.any(Number),
    });
    expect(response.body.clientHandoff).toBeGreaterThanOrEqual(1);
    expect(response.body.notDone).toBeGreaterThanOrEqual(4);
  });

  it('GET /projects/:id/activity returns feed items', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(
      app,
      'manager@test.local',
      SEED_PASSWORD,
    );

    await request(app.getHttpServer())
      .post(`/tasks/${SEED_IDS.taskMemberDemo}/comments`)
      .set(authHeader(managerToken))
      .send({ body: 'Activity feed comment' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/projects/${SEED_IDS.project}/activity`)
      .set(authHeader(managerToken))
      .expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(1);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'comment',
          body: 'Activity feed comment',
          taskId: SEED_IDS.taskMemberDemo,
        }),
      ]),
    );
  });

  it('GET /projects/:id/members lists project members for manager', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get(`/projects/${SEED_IDS.project}/members`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(4);
  });

  it('POST /projects/:id/members adds workspace member to project', async () => {
    const { app, prisma } = getContext();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'project-only@test.local',
        password: SEED_PASSWORD,
        name: 'Project Only',
      })
      .expect(201);

    const adminToken = await loginAs(app, 'admin@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/members`)
      .set(authHeader(adminToken))
      .send({ email: 'project-only@test.local', role: WorkspaceRole.MEMBER })
      .expect(201);

    const invitee = await prisma.user.findUnique({
      where: { email: 'project-only@test.local' },
    });
    expect(invitee).not.toBeNull();

    const managerToken = await loginAs(
      app,
      'manager@test.local',
      SEED_PASSWORD,
    );

    const response = await request(app.getHttpServer())
      .post(`/projects/${SEED_IDS.project}/members`)
      .set(authHeader(managerToken))
      .send({ userId: invitee!.id })
      .expect(201);

    expect(response.body.userId).toBe(invitee!.id);
  });

  it('DELETE /projects/:id removes disposable project', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(
      app,
      'manager@test.local',
      SEED_PASSWORD,
    );

    const created = await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/projects`)
      .set(authHeader(managerToken))
      .send({ name: 'Disposable project' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/projects/${created.body.id}`)
      .set(authHeader(managerToken))
      .expect(204);

    await request(app.getHttpServer())
      .get(`/projects/${created.body.id}`)
      .set(authHeader(managerToken))
      .expect(404);
  });
});
