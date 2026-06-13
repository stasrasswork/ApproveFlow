import request from 'supertest';
import { describeWithApp } from '../helpers/seeded-app.js';

describeWithApp('Health (e2e)', (getContext) => {
  it('GET /health returns ok with database check', async () => {
    const { app } = getContext();

    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'approveflow-api',
      checks: { database: 'ok' },
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.body.uptime).toEqual(expect.any(Number));
  });

  it('GET /health does not require authentication', async () => {
    const { app } = getContext();
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
