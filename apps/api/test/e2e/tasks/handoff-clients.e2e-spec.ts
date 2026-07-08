import request from 'supertest';
import { TaskStatus, WorkspaceRole } from '../../../src/generated/prisma/client.js';
import { authHeader, loginAs } from '../../helpers/auth.js';
import { describeWithSeededApp } from '../../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../../helpers/seed-e2e.js';

describeWithSeededApp('Client handoff selection (e2e)', (getContext) => {
  it('grants project access only to selected clients', async () => {
    const { app } = getContext();
    const adminToken = await loginAs(app, 'admin@test.local', SEED_PASSWORD);
    const managerToken = await loginAs(app, 'manager@test.local', SEED_PASSWORD);
    const selectedClientEmail = 'selected-client@test.local';
    const otherClientEmail = 'other-client@test.local';

    async function inviteClient(email: string): Promise<string> {
      const invite = await request(app.getHttpServer())
        .post(`/workspaces/${SEED_IDS.workspace}/members`)
        .set(authHeader(adminToken))
        .send({ email, role: WorkspaceRole.CLIENT_VIEW })
        .expect(201);

      const token = invite.body.inviteToken as string;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: SEED_PASSWORD, inviteToken: token, name: email })
        .expect(201);

      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set(authHeader(await loginAs(app, email, SEED_PASSWORD)))
        .expect(200);

      return me.body.id as string;
    }

    const selectedClientId = await inviteClient(selectedClientEmail);
    await inviteClient(otherClientEmail);

    const projectResponse = await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/projects`)
      .set(authHeader(managerToken))
      .send({ name: 'Selective handoff project' })
      .expect(201);

    const projectId = projectResponse.body.id as string;

    const taskResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set(authHeader(managerToken))
      .send({ title: 'Selective handoff task' })
      .expect(201);

    const taskId = taskResponse.body.id as string;

    for (const to of [TaskStatus.PRODUCTION, TaskStatus.INTERNAL_REVIEW]) {
      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/status`)
        .set(authHeader(managerToken))
        .send({ to })
        .expect(200);
    }

    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/status`)
      .set(authHeader(managerToken))
      .send({ to: TaskStatus.CLIENT_HANDOFF, clientUserIds: [selectedClientId] })
      .expect(200);

    const selectedClientToken = await loginAs(
      app,
      selectedClientEmail,
      SEED_PASSWORD,
    );
    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set(authHeader(selectedClientToken))
      .expect(200);

    const otherClientToken = await loginAs(app, otherClientEmail, SEED_PASSWORD);
    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set(authHeader(otherClientToken))
      .expect(403);

    const seedClientToken = await loginAs(app, 'client@test.local', SEED_PASSWORD);
    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set(authHeader(seedClientToken))
      .expect(403);
  });
});
