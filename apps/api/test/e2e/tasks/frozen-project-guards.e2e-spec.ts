import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { ProjectStatus, TaskStatus } from '../../../src/generated/prisma/client.js';
import { authHeader, loginAs } from '../../helpers/auth.js';
import { describeWithSeededApp } from '../../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../../helpers/seed-e2e.js';

async function createProjectWithTask(app: INestApplication, token: string) {
  const project = await request(app.getHttpServer())
    .post(`/workspaces/${SEED_IDS.workspace}/projects`)
    .set(authHeader(token))
    .send({ name: 'Guard test project' })
    .expect(201);

  const task = await request(app.getHttpServer())
    .post(`/projects/${project.body.id}/tasks`)
    .set(authHeader(token))
    .send({ title: 'Guard test task', assigneeId: SEED_IDS.member })
    .expect(201);

  return { projectId: project.body.id as string, taskId: task.body.id as string };
}

describeWithSeededApp('Frozen project guards (e2e)', (getContext) => {
  it.each([
    ['COMPLETED', ProjectStatus.COMPLETED],
    ['PAUSED', ProjectStatus.PAUSED],
  ])(
    'blocks task and comment changes when project is %s',
    async (_label, projectStatus) => {
      const { app } = getContext();
      const token = await loginAs(app, 'manager@test.local', SEED_PASSWORD);
      const { projectId, taskId } = await createProjectWithTask(app, token);

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .set(authHeader(token))
        .send({ status: projectStatus })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set(authHeader(token))
        .send({ title: 'Should fail' })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set(authHeader(token))
        .send({ title: 'Updated title' })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/status`)
        .set(authHeader(token))
        .send({ to: TaskStatus.PRODUCTION })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/due`)
        .set(authHeader(token))
        .send({ dueAt: '2030-01-01T00:00:00.000Z', reason: 'Test' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/comments`)
        .set(authHeader(token))
        .send({ body: 'Should fail' })
        .expect(400);
    },
  );
});
