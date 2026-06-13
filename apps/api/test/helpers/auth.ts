import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export async function loginAs(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const tokens = await loginTokens(app, email, password);
  return tokens.accessToken;
}

export async function loginTokens(
  app: INestApplication,
  email: string,
  password: string,
): Promise<AuthTokens> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    accessToken: response.body.access_token as string,
    refreshToken: response.body.refresh_token as string,
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
