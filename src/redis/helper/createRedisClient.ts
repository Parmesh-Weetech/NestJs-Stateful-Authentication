import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

export function createRedisClient(): RedisClientType {
    return createClient({
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
        password: process.env.REDIS_PASSWORD
    });
}