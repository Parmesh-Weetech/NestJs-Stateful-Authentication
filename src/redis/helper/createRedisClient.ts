import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

export function createRedisClient(): RedisClientType {
  const client = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    password: process.env.REDIS_PASSWORD,
  });

  client.on('error', (err) => {
    console.error('Redis error', err);
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  return client as RedisClientType;
}
