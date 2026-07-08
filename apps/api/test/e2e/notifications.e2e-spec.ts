import request from 'supertest';
import { authHeader, loginAs } from '../helpers/auth.js';
import { describeWithSeededApp } from '../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../helpers/seed-e2e.js';

describeWithSeededApp('Notifications (e2e)', (getContext) => {
  it('lists, counts and marks notifications for current user', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(app, 'manager@test.local', SEED_PASSWORD);
    const memberToken = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .post(`/tasks/${SEED_IDS.taskMemberDemo}/comments`)
      .set(authHeader(managerToken))
      .send({ body: 'Notify member' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/notifications')
      .set(authHeader(memberToken))
      .expect(200);

    expect(list.body.length).toBeGreaterThan(0);
    const notificationId = list.body[0].id as string;

    const unreadBefore = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authHeader(memberToken))
      .expect(200);
    expect(unreadBefore.body.count).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .patch(`/notifications/${notificationId}/read`)
      .set(authHeader(memberToken))
      .expect(204);

    await request(app.getHttpServer())
      .patch('/notifications/read-all')
      .set(authHeader(memberToken))
      .expect(204);

    const unreadAfter = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authHeader(memberToken))
      .expect(200);
    expect(unreadAfter.body.count).toBe(0);
  });

  it('does not allow reading another user notifications', async () => {
    const { app } = getContext();
    const managerToken = await loginAs(app, 'manager@test.local', SEED_PASSWORD);
    const memberToken = await loginAs(app, 'member@test.local', SEED_PASSWORD);

    await request(app.getHttpServer())
      .post(`/tasks/${SEED_IDS.taskMemberDemo}/comments`)
      .set(authHeader(managerToken))
      .send({ body: 'Ownership check' })
      .expect(201);

    const memberList = await request(app.getHttpServer())
      .get('/notifications')
      .set(authHeader(memberToken))
      .expect(200);
    const memberNotificationId = memberList.body[0].id as string;

    await request(app.getHttpServer())
      .patch(`/notifications/${memberNotificationId}/read`)
      .set(authHeader(managerToken))
      .expect(204);

    const unread = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authHeader(memberToken))
      .expect(200);
    expect(unread.body.count).toBeGreaterThan(0);
  });
});
