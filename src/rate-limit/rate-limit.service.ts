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
        ip: string,
    ) {
        const tokenBucketCheck = await this.checkTokenBucketLimitForIP(
            'ip:bucket',
            ip,
        );

        if (!tokenBucketCheck.allowed) {
            return tokenBucketCheck;
        }

        const slidingWindowCheck = await this.checkIpSlidingWindowV2(
            'ip',
            ip
        );

        return slidingWindowCheck;
    }

    async checkUserLimit(
        userId: string
    ) {
        const tokenBucketCheck = await this.checkTokenBucketLimitForUser(
            'user:bucket',
            userId,
        );

        if (!tokenBucketCheck.allowed) {
            return tokenBucketCheck;
        }

        const slidingWindowCheck = await this.checkUserSlidingWindow(
            'user',
            userId
        );

        return slidingWindowCheck;
    }

    async checkUserSlidingWindow(
        type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device' | 'ip:bucket' | 'user:bucket',
        userId: string
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, userId, undefined, undefined);

        const now = Date.now();

        const oldestAllowed = now - RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS;

        await this.redis.zRemRangeByScore(
            key,
            0,
            oldestAllowed,
        );

        const count = await this.redis.zCard(key);

        if (count >= RATE_LIMIT.USER.LIMIT) {
            return {
                allowed: false,
                currentCount: count,
                remaining: Math.max(0, RATE_LIMIT.USER.LIMIT - count),
            };
        }

        await this.redis.zAdd(key, {
            score: now,
            value: `${now}-${Math.random()}`,
        });

        await this.redis.expire(key, 60);

        return {
            allowed: count <= RATE_LIMIT.USER.LIMIT,
            currentCount: count,
            remaining: Math.max(0, RATE_LIMIT.USER.LIMIT - count),
        };
    }

    async checkIpSlidingWindowV1(
        type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device' | 'ip:bucket' | 'user:bucket',
        ip: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, undefined, ip, undefined);

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
        type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device' | 'ip:bucket' | 'user:bucket',
        ip: string
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, undefined, ip, undefined);

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

    async checkTokenBucketLimitForIP(
        type: 'ip:bucket',
        ip: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, undefined, ip, undefined);

        const now = Date.now();

        const bucket = await this.redis.hGetAll(key);

        let tokens = bucket.tokens
            ? Number(bucket.tokens)
            : RATE_LIMIT.IP_TOKEN_BUCKET.BUCKET_SIZE;

        let lastRefill = bucket.lastRefill
            ? Number(bucket.lastRefill)
            : now;

        const elapsedMs = now - lastRefill;
        
        // tokens earned since last refill
        const refillTokens =
            (elapsedMs / RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS) *
            RATE_LIMIT.IP_TOKEN_BUCKET.REFILL_PER_MINUTE;

        tokens = Math.min(
            RATE_LIMIT.IP_TOKEN_BUCKET.BUCKET_SIZE,
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

    async checkTokenBucketLimitForUser(
        type: 'user:bucket',
        userId: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey(type, userId, undefined, undefined);

        const now = Date.now();

        const bucket = await this.redis.hGetAll(key);

        let tokens = bucket.tokens
            ? Number(bucket.tokens)
            : RATE_LIMIT.USER_TOKEN_BUCKET.BUCKET_SIZE;

        let lastRefill = bucket.lastRefill
            ? Number(bucket.lastRefill)
            : now;

        const elapsedMs = now - lastRefill;

        // tokens earned since last refill
        const refillTokens =
            (elapsedMs / RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS) *
            RATE_LIMIT.USER_TOKEN_BUCKET.REFILL_PER_MINUTE;

        tokens = Math.min(
            RATE_LIMIT.USER_TOKEN_BUCKET.BUCKET_SIZE,
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
