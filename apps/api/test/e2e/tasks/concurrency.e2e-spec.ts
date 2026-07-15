import request from 'supertest';
import { TaskStatus } from '../../../src/generated/prisma/client.js';
import { authHeader, loginAs } from '../../helpers/auth.js';
import { describeWithSeededApp } from '../../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../../helpers/seed-e2e.js';

describeWithSeededApp('Task concurrency (e2e)', (getContext) => {
  it('handles parallel transitions with a single consistent final state', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const createResponse = await request(app.getHttpServer())
      .post(`/projects/${SEED_IDS.project}/tasks`)
      .set(authHeader(managerToken))
      .send({ title: 'Concurrency task' })
      .expect(201);

    const taskId = createResponse.body.id as string;
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/status`)
      .set(authHeader(managerToken))
      .send({ to: TaskStatus.PRODUCTION })
      .expect(200);

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/tasks/${taskId}/status`)
        .set(authHeader(managerToken))
        .send({ to: TaskStatus.INTERNAL_REVIEW }),
      request(app.getHttpServer())
        .patch(`/tasks/${taskId}/status`)
        .set(authHeader(managerToken))
        .send({ to: TaskStatus.INTERNAL_REVIEW }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const task = await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set(authHeader(managerToken))
      .expect(200);

    expect(task.body.status).toBe(TaskStatus.INTERNAL_REVIEW);

    const events = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/events`)
      .set(authHeader(managerToken))
      .expect(200);

    const internalReviewEvents = events.body.filter(
      (event: { toStatus: string }) => event.toStatus === TaskStatus.INTERNAL_REVIEW,
    );
    expect(internalReviewEvents).toHaveLength(1);
  });

  it('serializes parallel due date updates to the latest value', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const createResponse = await request(app.getHttpServer())
      .post(`/projects/${SEED_IDS.project}/tasks`)
      .set(authHeader(managerToken))
      .send({ title: 'Due concurrency task' })
      .expect(201);

    const taskId = createResponse.body.id as string;
    const dueDates = ['2026-08-01T12:00:00.000Z', '2026-08-02T12:00:00.000Z'];

    await Promise.all(
      dueDates.map((dueAt) =>
        request(app.getHttpServer())
          .patch(`/tasks/${taskId}/due`)
          .set(authHeader(managerToken))
          .send({ dueAt }),
      ),
    );

    const task = await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set(authHeader(managerToken))
      .expect(200);

    expect(dueDates).toContain(task.body.dueAt);
  });
});
