import { createClient } from 'redis';

const redis = createClient();

export async function acquireLock(key: string, ttl = 10000) {
  const result = await redis.set(key, 'locked', {
    NX: true,
    PX: ttl,
  });

  return result === 'OK';
}

export async function releaseLock(key: string) {
  await redis.del(key);
}
