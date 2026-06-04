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
            ip,
        );

        if (!tokenBucketCheck.allowed) {
            return tokenBucketCheck;
        }

        const slidingWindowCheck = await this.checkIpSlidingWindowV2(
            ip
        );

        return slidingWindowCheck;
    }

    async checkUserLimit(
        userId: string
    ) {
        const tokenBucketCheck = await this.checkTokenBucketLimitForUser(
            userId,
        );

        if (!tokenBucketCheck.allowed) {
            return tokenBucketCheck;
        }

        const slidingWindowCheck = await this.checkUserSlidingWindow(
            userId
        );

        return slidingWindowCheck;
    }

    async checkDeviceProtection(
        deviceId: string,
        fingerPrintId: string
    ) {
        const deviceBucket =
            await this.checkTokenBucketLimitForDevice(
                deviceId,
            );

        if (!deviceBucket.allowed) {
            return deviceBucket;
        }

        const deviceSliding =
            await this.checkSlidingWindowRateLimitForDevice(deviceId);

        if (!deviceSliding.allowed) {
            return deviceSliding;
        }

        const fingerprintBucket =
            await this.checkTokenBucketLimitForFingerprint(fingerPrintId);

        if (!fingerprintBucket.allowed) {
            return fingerprintBucket;
        }

        const fingerprintSliding =
            await this.checkSlidingWindowForFingerprint(fingerPrintId);

        return fingerprintSliding;
    }

    async checkSessionLimit(
        userId: string,
        sessionId: string,
    ) {
        const tokenBucketCheck = await this.checkTokenBucketForSession(
            userId,
            sessionId,
        );

        if (!tokenBucketCheck.allowed) {
            return tokenBucketCheck;
        }

        const slidingWindowCheck = await this.checkSlidingWindowForSession(
            userId,
            sessionId
        );

        return slidingWindowCheck;
    }

    async checkIpSlidingWindowV1(
        ip: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey('ip', undefined, ip, undefined, undefined, undefined);

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
        ip: string
    ) {
        const key = this.redisService.buildRedisRateLimitKey('ip', undefined, ip, undefined, undefined, undefined);

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

    async checkUserSlidingWindow(
        userId: string
    ) {
        const key = this.redisService.buildRedisRateLimitKey('user', userId, undefined, undefined, undefined, undefined);

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

    async checkTokenBucketLimitForIP(
        ip: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey('ip:bucket', undefined, ip, undefined, undefined, undefined);

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
        userId: string,
    ) {
        const key = this.redisService.buildRedisRateLimitKey('user:bucket', userId, undefined, undefined, undefined, undefined);

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

    async checkTokenBucketLimitForDevice(
        deviceId: string
    ) {
        const key = this.redisService.buildRedisRateLimitKey('device:bucket', undefined, undefined, deviceId, undefined, undefined);

        const now = Date.now();

        const bucket = await this.redis.hGetAll(key);

        let tokens = bucket.tokens
            ? Number(bucket.tokens)
            : RATE_LIMIT.DEVICE_TOKEN_BUCKET.BUCKET_SIZE;

        let lastRefill = bucket.lastRefill
            ? Number(bucket.lastRefill)
            : now;

        const elapsedMs = now - lastRefill;

        // tokens earned since last refill
        const refillTokens =
            (elapsedMs / RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS) *
            RATE_LIMIT.DEVICE_TOKEN_BUCKET.REFILL_PER_MINUTE;

        tokens = Math.min(
            RATE_LIMIT.DEVICE_TOKEN_BUCKET.BUCKET_SIZE,
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

    async checkSlidingWindowRateLimitForDevice(
        deviceId: string
    ) {
        const key = this.redisService.buildRedisRateLimitKey('device', undefined, undefined, deviceId, undefined, undefined);

        const now = Date.now();

        const oldestAllowed = now - RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS;

        await this.redis.zRemRangeByScore(
            key,
            0,
            oldestAllowed,
        );

        const count = await this.redis.zCard(key);

        if (count >= RATE_LIMIT.DEVICE.LIMIT) {
            return {
                allowed: false,
                currentCount: count,
                remaining: Math.max(0, RATE_LIMIT.DEVICE.LIMIT - count),
            };
        }

        await this.redis.zAdd(key, {
            score: now,
            value: `${now}-${Math.random()}`,
        });

        await this.redis.expire(key, RATE_LIMIT.DEVICE.TTL_SECONDS);

        return {
            allowed: count <= RATE_LIMIT.DEVICE.LIMIT,
            currentCount: count,
            remaining: Math.max(0, RATE_LIMIT.DEVICE.LIMIT - count),
        };
    }

    async checkTokenBucketLimitForFingerprint(
        fingerprintId: string
    ) {
        const key = this.redisService.buildRedisRateLimitKey('fingerprint:bucket', undefined, undefined, undefined, fingerprintId, undefined);

        const now = Date.now();
        
        const bucket = await this.redis.hGetAll(key);

        let tokens = bucket.tokens
            ? Number(bucket.tokens)
            : RATE_LIMIT.FINGERPRINT_TOKEN_BUCKET.BUCKET_SIZE;

        let lastRefill = bucket.lastRefill
            ? Number(bucket.lastRefill)
            : now;

        const elapsedMs = now - lastRefill;

        // tokens earned since last refill
        const refillTokens =
            (elapsedMs / RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS) *
            RATE_LIMIT.FINGERPRINT_TOKEN_BUCKET.REFILL_PER_MINUTE;

        tokens = Math.min(
            RATE_LIMIT.FINGERPRINT_TOKEN_BUCKET.BUCKET_SIZE,
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

    async checkSlidingWindowForFingerprint(
        fingerprintId: string
    ) {
        const key = this.redisService.buildRedisRateLimitKey('fingerprint', undefined, undefined, undefined, fingerprintId, undefined);

        const now = Date.now();

        const oldestAllowed = now - RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS;

        await this.redis.zRemRangeByScore(
            key,
            0,
            oldestAllowed,
        );

        const count = await this.redis.zCard(key);

        if (count >= RATE_LIMIT.FINGERPRINT.LIMIT) {
            return {
                allowed: false,
                currentCount: count,
                remaining: Math.max(0, RATE_LIMIT.FINGERPRINT.LIMIT - count),
            };
        }

        await this.redis.zAdd(key, {
            score: now,
            value: `${now}-${Math.random()}`,
        });

        await this.redis.expire(key, RATE_LIMIT.FINGERPRINT.TTL_SECONDS);

        return {
            allowed: count <= RATE_LIMIT.FINGERPRINT.LIMIT,
            currentCount: count,
            remaining: Math.max(0, RATE_LIMIT.FINGERPRINT.LIMIT - count),
        };
    }

    async checkTokenBucketForSession(
        userId: string,
        sessionId: string
    ) {
        const key = this.redisService.buildRedisRateLimitKey('user:session:bucket', userId, undefined, undefined, undefined, sessionId);

        const now = Date.now();

        const bucket = await this.redis.hGetAll(key);

        let tokens = bucket.tokens
            ? Number(bucket.tokens)
            : RATE_LIMIT.SESSION_TOKEN_BUCKET.BUCKET_SIZE;

        let lastRefill = bucket.lastRefill
            ? Number(bucket.lastRefill)
            : now;

        const elapsedMs = now - lastRefill;

        // tokens earned since last refill
        const refillTokens =
            (elapsedMs / RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS) *
            RATE_LIMIT.SESSION_TOKEN_BUCKET.REFILL_PER_MINUTE;

        tokens = Math.min(
            RATE_LIMIT.SESSION_TOKEN_BUCKET.BUCKET_SIZE,
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

    async checkSlidingWindowForSession(
        userId: string,
        sessionId: string
    ) {
        const key = this.redisService.buildRedisRateLimitKey('user:session', userId, undefined, undefined, undefined, sessionId);

        const now = Date.now();

        const oldestAllowed = now - RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS;

        await this.redis.zRemRangeByScore(
            key,
            0,
            oldestAllowed,
        );

        const count = await this.redis.zCard(key);

        if (count >= RATE_LIMIT.SESSION.LIMIT) {
            return {
                allowed: false,
                currentCount: count,
                remaining: Math.max(0, RATE_LIMIT.SESSION.LIMIT - count),
            };
        }

        await this.redis.zAdd(key, {
            score: now,
            value: `${now}-${Math.random()}`,
        });

        await this.redis.expire(key, RATE_LIMIT.SESSION.TTL_SECONDS);

        return {
            allowed: count <= RATE_LIMIT.SESSION.LIMIT,
            currentCount: count,
            remaining: Math.max(0, RATE_LIMIT.SESSION.LIMIT - count),
        };
    }

    async checkSlidingWindowGeneric(key: string, limit: number, windowMs: number) {
        const now = Date.now();
        const oldestAllowed = now - windowMs;

        await this.redis.zRemRangeByScore(key, 0, oldestAllowed);
        const count = await this.redis.zCard(key);

        if (count >= limit) {
            return { allowed: false, currentCount: count, remaining: 0 };
        }

        await this.redis.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
        await this.redis.expire(key, Math.ceil(windowMs / 1000));

        return { allowed: true, currentCount: count + 1, remaining: limit - (count + 1) };
    }

    async checkLoginLimit(email: string, ip: string, deviceId: string) {
        const limit = RATE_LIMIT.LOGIN.LIMIT;
        const windowMs = RATE_LIMIT.SLIDING_WINDOW.WINDOW_MS;

        const emailKey = this.redisService.buildRedisRateLimitKey('login:email', email);
        const ipKey = this.redisService.buildRedisRateLimitKey('login:ip', undefined, ip);
        const deviceKey = this.redisService.buildRedisRateLimitKey('login:device', undefined, undefined, deviceId);

        const emailResult = await this.checkSlidingWindowGeneric(emailKey, limit, windowMs);
        if (!emailResult.allowed) return { allowed: false, reason: 'Too many login attempts' };

        const ipResult = await this.checkSlidingWindowGeneric(ipKey, limit, windowMs);
        if (!ipResult.allowed) return { allowed: false, reason: 'Too many login attempts' };

        const deviceResult = await this.checkSlidingWindowGeneric(deviceKey, limit, windowMs);
        if (!deviceResult.allowed) return { allowed: false, reason: 'Too many login attempts' };

        return { allowed: true };
    }
}
