import request from 'supertest';
import { TaskStatus } from '../../src/generated/prisma/client.js';
import { authHeader, loginAs } from '../helpers/auth.js';
import { describeWithSeededApp } from '../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../helpers/seed-e2e.js';

describeWithSeededApp('Onboarding scenario A (e2e)', (getContext) => {
  it('manager creates project, task in brief, and assigns member', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const projectResponse = await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/projects`)
      .set(authHeader(managerToken))
      .send({ name: 'Campaign Q2', description: 'Launch assets' })
      .expect(201);

    const projectId = projectResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set(authHeader(managerToken))
      .send({ userId: SEED_IDS.member })
      .expect(201);

    const taskResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set(authHeader(managerToken))
      .send({
        title: 'Hero banner',
        description: 'Homepage hero for Q2',
        assigneeId: SEED_IDS.member,
      })
      .expect(201);

    expect(taskResponse.body).toMatchObject({
      projectId,
      title: 'Hero banner',
      status: TaskStatus.BRIEF,
      assigneeId: SEED_IDS.member,
    });

    const memberToken = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    const memberTasks = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set(authHeader(memberToken))
      .expect(200);

    expect(memberTasks.body).toEqual([
      expect.objectContaining({
        id: taskResponse.body.id,
        assigneeId: SEED_IDS.member,
      }),
    ]);
  });
});
