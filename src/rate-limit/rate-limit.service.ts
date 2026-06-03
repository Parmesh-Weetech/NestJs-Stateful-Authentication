import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { RATE_LIMIT } from './constants/rate-limit.constant';
import { RedisClientType } from 'redis';

@Injectable()
export class RateLimitService {
    redis: RedisClientType;

    constructor(
        private readonly redisService: RedisService,
    ) {
        this.redis = this.redisService.getClient();
    }

    async checkIpLimit(
        type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device',
        userId?: string,
        ip?: string,
        deviceId?: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, userId, ip, deviceId);

        const count = await this.redis.incr(key);

        if (count === 1) {
            await this.redis.expire(key, RATE_LIMIT.IP.TTL_SECONDS);
        }

        return {
            allowed: count <= RATE_LIMIT.IP.LIMIT,
            currentCount: count,
            remaining: Math.max(0, RATE_LIMIT.IP.LIMIT - count),
        };
    }

    async checkIpSlidingWindowV1(
        type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device',
        userId?: string,
        ip?: string,
        deviceId?: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, userId, ip, deviceId);

        const now = Date.now();

        const oldestAllowed = now - RATE_LIMIT.IP.WINDOW_MS;

        await this.redis.zRemRangeByScore(
            key,
            0,
            oldestAllowed,
        );

        await this.redis.zAdd(key, {
            score: now,
            value: `${now}-${Math.random()}`,
        });

        const count = await this.redis.zCard(key);

        await this.redis.expire(key, 60);

        return {
            allowed: count <= RATE_LIMIT.IP.LIMIT,
            currentCount: count,
            remaining: Math.max(0, RATE_LIMIT.IP.LIMIT - count),
        };
    }

    async checkIpSlidingWindowV2(
        type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device',
        userId?: string,
        ip?: string,
        deviceId?: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, userId, ip, deviceId);

        const now = Date.now();

        const oldestAllowed = now - RATE_LIMIT.IP.WINDOW_MS;

        await this.redis.zRemRangeByScore(
            key,
            0,
            oldestAllowed,
        );

        const count = await this.redis.zCard(key);

        if (count >= RATE_LIMIT.IP.LIMIT) {
            return {
                allowed: false,
                currentCount: count,
                remaining: Math.max(0, RATE_LIMIT.IP.LIMIT - count),
            };
        }


        await this.redis.expire(key, 60);

        return {
            allowed: count <= RATE_LIMIT.IP.LIMIT,
            currentCount: count,
            remaining: Math.max(0, RATE_LIMIT.IP.LIMIT - count),
        };
    }
}
