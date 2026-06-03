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
        userId?: string,
        ip?: string,
        deviceId?: string,
    ) {
        const tokenBucketCheck = await this.checkTokenBucketLimit(
            'ip:bucket',
            userId,
            ip,
            deviceId
        );

        if (!tokenBucketCheck.allowed) {
            return tokenBucketCheck;
        }

        const slidingWindowCheck = await this.checkIpSlidingWindowV2(
            'ip',
            userId,
            ip,
            deviceId
        );

        return slidingWindowCheck;
    }

    async checkIpSlidingWindowV1(
        type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device' | 'ip:bucket',
        userId?: string,
        ip?: string,
        deviceId?: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, userId, ip, deviceId);

        const now = Date.now();

        const oldestAllowed = now - RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS;

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

        await this.redis.expire(key, RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS);

        return {
            allowed: count <= RATE_LIMIT.IP.LIMIT,
            currentCount: count,
            remaining: Math.max(0, RATE_LIMIT.IP.LIMIT - count),
        };
    }

    async checkIpSlidingWindowV2(
        type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device' | 'ip:bucket',
        userId?: string,
        ip?: string,
        deviceId?: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, userId, ip, deviceId);

        const now = Date.now();

        const oldestAllowed = now - RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS;

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

        await this.redis.zAdd(key, {
            score: now,
            value: `${now}-${Math.random()}`,
        });

        await this.redis.expire(key, 60);

        return {
            allowed: count <= RATE_LIMIT.IP.LIMIT,
            currentCount: count,
            remaining: Math.max(0, RATE_LIMIT.IP.LIMIT - count),
        };
    }

    async checkTokenBucketLimit(
        type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device' | 'ip:bucket',
        userId?: string,
        ip?: string,
        deviceId?: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, userId, ip, deviceId);

        const now = Date.now();

        const bucket = await this.redis.hGetAll(key);

        let tokens = bucket.tokens
            ? Number(bucket.tokens)
            : RATE_LIMIT.TOKEN_BUCKET.BUCKET_SIZE;

        let lastRefill = bucket.lastRefill
            ? Number(bucket.lastRefill)
            : now;

        const elapsedMs = now - lastRefill;
        
        // tokens earned since last refill
        const refillTokens =
            (elapsedMs / 60000) *
            RATE_LIMIT.TOKEN_BUCKET.REFILL_PER_MINUTE;

        tokens = Math.min(
            RATE_LIMIT.TOKEN_BUCKET.BUCKET_SIZE,
            tokens + refillTokens,
        );

        if (tokens < 1) {
            return {
                allowed: false,
                tokensRemaining: tokens,
            };
        }

        // consume token
        tokens -= 1;

        await this.redis.hSet(key, {
            tokens: tokens.toString(),
            lastRefill: now.toString(),
        });

        await this.redis.expire(key, 120);

        return {
            allowed: tokens >= 1,
            tokensRemaining: tokens,
        };
    }
}
