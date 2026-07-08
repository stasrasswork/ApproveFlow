import request from 'supertest';
import { MailService } from '../../src/mail/mail.service.js';
import { EmailOutboxService } from '../../src/mail/email-outbox.service.js';
import { EmailOutboxStatus, TaskStatus } from '../../src/generated/prisma/client.js';
import { authHeader, loginAs } from '../helpers/auth.js';
import { describeWithSeededApp } from '../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../helpers/seed-e2e.js';

describeWithSeededApp('Email outbox (e2e)', (getContext) => {
  it('retries transient SMTP failures and marks permanent failures as dead-letter', async () => {
    const { app, prisma } = getContext();
    const managerToken = await loginAs(app, 'manager@test.local', SEED_PASSWORD);
    const mailService = app.get(MailService);

    const sendSpy = jest
      .spyOn(mailService, 'send')
      .mockRejectedValueOnce(new Error('SMTP unavailable'))
      .mockResolvedValue(true);

    const createResponse = await request(app.getHttpServer())
      .post(`/projects/${SEED_IDS.project}/tasks`)
      .set(authHeader(managerToken))
      .send({ title: 'Outbox retry task' })
      .expect(201);

    const taskId = createResponse.body.id as string;
    for (const to of [
      TaskStatus.PRODUCTION,
      TaskStatus.INTERNAL_REVIEW,
      TaskStatus.CLIENT_HANDOFF,
    ]) {
      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/status`)
        .set(authHeader(managerToken))
        .send(
          to === TaskStatus.CLIENT_HANDOFF
            ? { to, clientUserIds: [SEED_IDS.client] }
            : { to },
        )
        .expect(200);
    }

    const outbox = app.get(EmailOutboxService);
    await outbox.processPending();
    await prisma.emailOutbox.updateMany({
      where: {
        correlationId: taskId,
        status: EmailOutboxStatus.PENDING,
      },
      data: { nextRetryAt: new Date(0) },
    });
    await outbox.processPending();

    const sentEntry = await prisma.emailOutbox.findFirst({
      where: { correlationId: taskId },
    });
    expect(sentEntry?.status).toBe(EmailOutboxStatus.SENT);
    expect(sentEntry?.attempts).toBeGreaterThanOrEqual(1);
    expect(sendSpy).toHaveBeenCalled();

    sendSpy.mockReset();
    sendSpy.mockRejectedValue(new Error('SMTP permanently down'));

    const failedTaskResponse = await request(app.getHttpServer())
      .post(`/projects/${SEED_IDS.project}/tasks`)
      .set(authHeader(managerToken))
      .send({ title: 'Outbox DLQ task' })
      .expect(201);

    const failedTaskId = failedTaskResponse.body.id as string;
    for (const to of [
      TaskStatus.PRODUCTION,
      TaskStatus.INTERNAL_REVIEW,
      TaskStatus.CLIENT_HANDOFF,
    ]) {
      await request(app.getHttpServer())
        .patch(`/tasks/${failedTaskId}/status`)
        .set(authHeader(managerToken))
        .send(
          to === TaskStatus.CLIENT_HANDOFF
            ? { to, clientUserIds: [SEED_IDS.client] }
            : { to },
        )
        .expect(200);
    }

    const outboxProcessor = app.get(EmailOutboxService);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await prisma.emailOutbox.updateMany({
        where: {
          correlationId: failedTaskId,
          status: EmailOutboxStatus.PENDING,
        },
        data: { nextRetryAt: new Date(0) },
      });
      await outboxProcessor.processPending();
    }

    const failedEntry = await prisma.emailOutbox.findFirst({
      where: { correlationId: failedTaskId },
    });
    expect(failedEntry?.status).toBe(EmailOutboxStatus.FAILED);
    expect(failedEntry?.attempts).toBeGreaterThanOrEqual(5);

    const task = await request(app.getHttpServer())
      .get(`/tasks/${failedTaskId}`)
      .set(authHeader(managerToken))
      .expect(200);
    expect(task.body.status).toBe(TaskStatus.CLIENT_HANDOFF);

    sendSpy.mockRestore();
  });
});
