import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ENV } from './env.js';

export function createThrottlerOptions(): ThrottlerModuleOptions {
  const redisUrl = ENV.REDIS_URL?.trim();
  const storage = redisUrl
    ? new ThrottlerStorageRedisService(redisUrl)
    : undefined;

  const limit = ENV.NODE_ENV === 'test' ? 10_000 : 120;

  return {
    throttlers: [{ name: 'default', ttl: 60_000, limit }],
    // E2E suites login many times from one IP; enable only in auth-throttling.e2e-spec.
    skipIf: () =>
      ENV.NODE_ENV === 'test' && process.env.E2E_ENABLE_THROTTLE !== 'true',
    ...(storage ? { storage } : {}),
  };
}
