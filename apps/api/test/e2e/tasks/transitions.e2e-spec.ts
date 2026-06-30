import request from 'supertest';
import { TaskStatus } from '../../../src/generated/prisma/client.js';
import { authHeader, loginAs } from '../../helpers/auth.js';
import { describeWithSeededApp } from '../../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../../helpers/seed-e2e.js';

describeWithSeededApp('Task transitions (e2e)', (getContext) => {
  it('scenario B: manager moves task brief → production → internal_review → client_handoff', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const createResponse = await request(app.getHttpServer())
      .post(`/projects/${SEED_IDS.project}/tasks`)
      .set(authHeader(token))
      .send({
        title: 'Banner',
        assigneeId: SEED_IDS.member,
      })
      .expect(201);

    const taskId = createResponse.body.id as string;
    expect(createResponse.body.status).toBe(TaskStatus.BRIEF);

    for (const to of [
      TaskStatus.PRODUCTION,
      TaskStatus.INTERNAL_REVIEW,
      TaskStatus.CLIENT_HANDOFF,
    ]) {
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/status`)
        .set(authHeader(token))
        .send({ to })
        .expect(200);

      expect(response.body.status).toBe(to);
    }

    const eventsResponse = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/events`)
      .set(authHeader(token))
      .expect(200);

    expect(eventsResponse.body).toHaveLength(3);
  });

  it('scenario C: client accepts handoff and approves', async () => {
    const { app } = getContext();
    const clientToken = await loginAs(app, 'client@test.local', SEED_PASSWORD);

    const handoffResponse = await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskClientHandoff}/status`)
      .set(authHeader(clientToken))
      .send({ to: TaskStatus.CLIENT_APPROVAL })
      .expect(200);

    expect(handoffResponse.body.status).toBe(TaskStatus.CLIENT_APPROVAL);

    const approvalResponse = await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskClientApproval}/status`)
      .set(authHeader(clientToken))
      .send({ to: TaskStatus.PENDING_CLOSURE })
      .expect(200);

    expect(approvalResponse.body.status).toBe(TaskStatus.PENDING_CLOSURE);
  });

  it('scenario D: manager closes pending_closure → done', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskPendingClosure}/status`)
      .set(authHeader(token))
      .send({ to: TaskStatus.DONE })
      .expect(200);

    expect(response.body.status).toBe(TaskStatus.DONE);
  });

  it('client cannot skip to pending_closure from client_handoff', async () => {
    const { app } = getContext();
    const clientToken = await loginAs(app, 'client@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskClientHandoff}/status`)
      .set(authHeader(clientToken))
      .send({ to: TaskStatus.PENDING_CLOSURE })
      .expect(403);
  });

  it('member cannot change task status', async () => {
    const { app } = getContext();
    const memberToken = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskMemberDemo}/status`)
      .set(authHeader(memberToken))
      .send({ to: TaskStatus.INTERNAL_REVIEW })
      .expect(403);
  });

  it('client request changes requires comment', async () => {
    const { app } = getContext();
    const clientToken = await loginAs(app, 'client@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskClientApproval}/status`)
      .set(authHeader(clientToken))
      .send({ to: TaskStatus.PRODUCTION })
      .expect(400);

    const response = await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskClientApproval}/status`)
      .set(authHeader(clientToken))
      .send({ to: TaskStatus.PRODUCTION, comment: 'Fix the headline' })
      .expect(200);

    expect(response.body.status).toBe(TaskStatus.PRODUCTION);

    const comments = await request(app.getHttpServer())
      .get(`/tasks/${SEED_IDS.taskClientApproval}/comments`)
      .set(authHeader(clientToken))
      .expect(200);

    expect(comments.body).toHaveLength(1);
    expect(comments.body[0].body).toBe('Fix the headline');
  });

  it('manager recalls task from client_handoff to internal_review', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(
      app,
      'manager@test.local',
      SEED_PASSWORD,
    );

    const response = await request(app.getHttpServer())
      .patch(`/tasks/${SEED_IDS.taskClientHandoff}/status`)
      .set(authHeader(managerToken))
      .send({ to: TaskStatus.INTERNAL_REVIEW })
      .expect(200);

    expect(response.body.status).toBe(TaskStatus.INTERNAL_REVIEW);
  });

  it('manager cycles internal_review ↔ production for revisions', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(
      app,
      'manager@test.local',
      SEED_PASSWORD,
    );

    const createResponse = await request(app.getHttpServer())
      .post(`/projects/${SEED_IDS.project}/tasks`)
      .set(authHeader(managerToken))
      .send({ title: 'Review loop task' })
      .expect(201);

    const taskId = createResponse.body.id as string;

    for (const to of [
      TaskStatus.PRODUCTION,
      TaskStatus.INTERNAL_REVIEW,
      TaskStatus.PRODUCTION,
      TaskStatus.INTERNAL_REVIEW,
    ]) {
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/status`)
        .set(authHeader(managerToken))
        .send({ to })
        .expect(200);

      expect(response.body.status).toBe(to);
    }
  });
});
