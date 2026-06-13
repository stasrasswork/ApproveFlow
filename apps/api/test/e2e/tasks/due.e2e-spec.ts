import request from 'supertest';
import { TaskStatus } from '../../../src/generated/prisma/client.js';
import { authHeader, loginAs } from '../../helpers/auth.js';
import { describeWithSeededApp } from '../../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../../helpers/seed-e2e.js';

describeWithSeededApp('Task due and transitions metadata (e2e)', (getContext) => {
  it('PATCH /tasks/:id/due updates due date for manager', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);
    const dueAt = '2026-12-31T12:00:00.000Z';

    const response = await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskMemberDemo}/due`)
      .set(authHeader(token))
      .send({ dueAt, reason: 'Client agreed on new date' })
      .expect(200);

    expect(response.body.dueAt).toBe(dueAt);
  });

  it('PATCH /tasks/:id/due rejects member', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskMemberDemo}/due`)
      .set(authHeader(token))
      .send({ dueAt: '2026-12-31T12:00:00.000Z' })
      .expect(403);
  });

  it('GET /tasks/:id/due-changes returns history after due update', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);
    const dueAt = '2026-11-15T09:00:00.000Z';

    await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskMemberDemo}/due`)
      .set(authHeader(token))
      .send({ dueAt, reason: 'Shifted sprint' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${SEED_IDS.taskMemberDemo}/due-changes`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      newDueAt: dueAt,
      reason: 'Shifted sprint',
      changedBy: {
        id: SEED_IDS.manager,
        email: 'manager@test.local',
      },
    });
  });

  it('GET /tasks/:id/allowed-transitions returns targets for manager', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${SEED_IDS.taskMemberDemo}/allowed-transitions`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body.targets).toEqual([TaskStatus.INTERNAL_REVIEW]);
  });

  it('GET /tasks/:id/events returns status history after transition', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskMemberDemo}/status`)
      .set(authHeader(token))
      .send({ to: TaskStatus.INTERNAL_REVIEW })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${SEED_IDS.taskMemberDemo}/events`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      fromStatus: TaskStatus.PRODUCTION,
      toStatus: TaskStatus.INTERNAL_REVIEW,
      actor: {
        id: SEED_IDS.manager,
        email: 'manager@test.local',
      },
    });
  });
});
