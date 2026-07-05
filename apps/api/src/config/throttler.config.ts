import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

export function createThrottlerOptions(): ThrottlerModuleOptions {
  const redisUrl = process.env.REDIS_URL?.trim();
  const storage = redisUrl
    ? new ThrottlerStorageRedisService(redisUrl)
    : undefined;

  return {
    throttlers: [{ name: 'default', ttl: 60_000, limit: 20 }],
    ...(storage ? { storage } : {}),
  };
}
