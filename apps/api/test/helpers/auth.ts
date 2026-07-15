import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

function parseCookieValue(
  setCookie: string[] | string | undefined,
  name: string,
): string {
  const cookies = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.slice(name.length + 1).split(';')[0]);
    }
  }
  throw new Error(`Missing ${name} cookie in Set-Cookie header`);
}

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

  if (response.body?.ok !== true) {
    throw new Error(
      `Expected login body { ok: true }, got ${JSON.stringify(response.body)}`,
    );
  }

  const setCookie = response.headers['set-cookie'];
  return {
    accessToken: parseCookieValue(setCookie, 'access_token'),
    refreshToken: parseCookieValue(setCookie, 'refresh_token'),
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
