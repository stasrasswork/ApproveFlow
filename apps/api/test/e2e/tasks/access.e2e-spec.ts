import request from 'supertest';

import { authHeader, loginAs } from '../../helpers/auth.js';
import { describeWithSeededApp } from '../../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../../helpers/seed-e2e.js';

describeWithSeededApp('Task access (e2e)', (getContext) => {
  it('member sees only assigned tasks in project list', async () => {
    const { app } = getContext();
    const memberToken = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get(`/projects/${SEED_IDS.project}/tasks`)
      .set(authHeader(memberToken))
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    for (const task of response.body) {
      expect(task.assigneeId).toBe(SEED_IDS.member);
    }
  });

  it('manager sees all project tasks', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(
      app,
      'manager@test.local',
      SEED_PASSWORD,
    );

    const response = await request(app.getHttpServer())
      .get(`/projects/${SEED_IDS.project}/tasks`)
      .set(authHeader(managerToken))
      .expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(4);
  });

  it('member cannot access unassigned task by id', async () => {
    const { app } = getContext();
    const memberToken = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .get(`/tasks/${SEED_IDS.taskPendingClosure}`)
      .set(authHeader(memberToken))
      .expect(403);
  });

  it('PATCH /tasks/:id updates task metadata for manager', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(
      app,
      'manager@test.local',
      SEED_PASSWORD,
    );

    const response = await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskMemberDemo}`)
      .set(authHeader(managerToken))
      .send({
        title: 'Updated title',
        description: 'Updated description',
        sprintLabel: 'Sprint 2',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: SEED_IDS.taskMemberDemo,
      title: 'Updated title',
      description: 'Updated description',
      sprintLabel: 'Sprint 2',
    });
  });

  it('PATCH /tasks/:id rejects member updates', async () => {
    const { app } = getContext();
    const memberToken = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskMemberDemo}`)
      .set(authHeader(memberToken))
      .send({ title: 'Hacked title' })
      .expect(403);
  });

  it('PATCH /tasks/:id rejects invalid assignee', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(
      app,
      'manager@test.local',
      SEED_PASSWORD,
    );

    await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskMemberDemo}`)
      .set(authHeader(managerToken))
      .send({ assigneeId: SEED_IDS.client })
      .expect(400);
  });
});
