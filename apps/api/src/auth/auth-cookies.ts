import type { Response } from 'express';
import { ENV } from '../config/env.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

/** Host-wide path so cookies work for direct API hosts and nginx `/api` proxy. */
const COOKIE_PATH = '/';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: new URL(ENV.APP_URL).protocol === 'https:',
    sameSite: 'lax' as const,
    path: COOKIE_PATH,
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { access_token: string; refresh_token: string },
): void {
  const options = cookieOptions();
  res.cookie(ACCESS_COOKIE, tokens.access_token, {
    ...options,
    maxAge: 60 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refresh_token, {
    ...options,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  const options = cookieOptions();
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}
