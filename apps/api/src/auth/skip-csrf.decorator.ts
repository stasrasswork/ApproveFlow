import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';

/** Skip CSRF for public unauthenticated endpoints (login/register/forgot/reset). */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
