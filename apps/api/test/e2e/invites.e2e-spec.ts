import request from 'supertest';
import { WorkspaceRole } from '../../src/generated/prisma/client.js';
import { authHeader, loginAs } from '../helpers/auth.js';
import { describeWithSeededApp } from '../helpers/seeded-app.js';
import { SEED_IDS, SEED_PASSWORD } from '../helpers/seed-e2e.js';

describeWithSeededApp('Invite lifecycle (e2e)', (getContext) => {
  it('accepts invite during registration and rejects token reuse', async () => {
    const { app } = getContext();
    const adminToken = await loginAs(app, 'admin@test.local', SEED_PASSWORD);
    const email = 'invite-flow@test.local';

    const invite = await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/members`)
      .set(authHeader(adminToken))
      .send({ email, role: WorkspaceRole.CLIENT_VIEW })
      .expect(201);

    const token = invite.body.inviteToken as string;
    expect(token).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: SEED_PASSWORD, inviteToken: token, name: 'Invite Flow' })
      .expect(201);

    const authToken = await loginAs(app, email, SEED_PASSWORD);
    await request(app.getHttpServer())
      .post('/auth/accept-invite')
      .set(authHeader(authToken))
      .send({ token })
      .expect(400);
  });

  it('rejects expired and wrong-email invite token', async () => {
    const { app, prisma } = getContext();
    const adminToken = await loginAs(app, 'admin@test.local', SEED_PASSWORD);

    const expiredInvite = await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/members`)
      .set(authHeader(adminToken))
      .send({ email: 'expired-invite@test.local', role: WorkspaceRole.MEMBER })
      .expect(201);
    const expiredToken = expiredInvite.body.inviteToken as string;

    await prisma.workspaceInvite.updateMany({
      where: { email: 'expired-invite@test.local' },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'expired-invite@test.local',
        password: SEED_PASSWORD,
        inviteToken: expiredToken,
      })
      .expect(400);

    const wrongEmailInvite = await request(app.getHttpServer())
      .post(`/workspaces/${SEED_IDS.workspace}/members`)
      .set(authHeader(adminToken))
      .send({ email: 'actual-invite@test.local', role: WorkspaceRole.MEMBER })
      .expect(201);
    const wrongEmailToken = wrongEmailInvite.body.inviteToken as string;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'different-user@test.local',
        password: SEED_PASSWORD,
        inviteToken: wrongEmailToken,
      })
      .expect(400);
  });
});
