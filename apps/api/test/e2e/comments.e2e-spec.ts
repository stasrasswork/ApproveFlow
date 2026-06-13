import request from 'supertest';

import { authHeader, loginAs } from '../helpers/auth.js';
import { describeWithSeededApp } from '../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../helpers/seed-e2e.js';

describeWithSeededApp('Comments (e2e)', (getContext) => {
  it('GET /tasks/:id/comments requires authentication', async () => {
    const { app } = getContext();
    await request(app.getHttpServer())
      .get(`/tasks/${SEED_IDS.taskMemberDemo}/comments`)
      .expect(401);
  });

  it('GET /tasks/:id/comments returns empty list initially', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${SEED_IDS.taskMemberDemo}/comments`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('POST /tasks/:id/comments creates comment for member', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    const created = await request(app.getHttpServer())
      .post(`/tasks/${SEED_IDS.taskMemberDemo}/comments`)
      .set(authHeader(token))
      .send({ body: 'Progress update' })
      .expect(201);

    expect(created.body).toMatchObject({
      taskId: SEED_IDS.taskMemberDemo,
      authorId: SEED_IDS.member,
      body: 'Progress update',
    });

    const listed = await request(app.getHttpServer())
      .get(`/tasks/${SEED_IDS.taskMemberDemo}/comments`)
      .set(authHeader(token))
      .expect(200);

    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].body).toBe('Progress update');
  });

  it('POST /tasks/:id/comments allows client on assigned project task', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'client@test.local', SEED_PASSWORD);

    const response = await request(app.getHttpServer())
      .post(`/tasks/${SEED_IDS.taskClientHandoff}/comments`)
      .set(authHeader(token))
      .send({ body: 'Question about deliverable' })
      .expect(201);

    expect(response.body.body).toBe('Question about deliverable');
  });

  it('POST /tasks/:id/comments rejects member on unassigned task', async () => {
    const { app } = getContext();
    const token = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .post(`/tasks/${SEED_IDS.taskPendingClosure}/comments`)
      .set(authHeader(token))
      .send({ body: 'Should fail' })
      .expect(403);
  });
});
