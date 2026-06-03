import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { RATE_LIMIT } from './constants/rate-limit.constant';

@Injectable()
export class RateLimitService {
    constructor(
        private readonly redisService: RedisService,
    ) { }

    async checkFixedWindowRateLimit(
        type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device',
        userId?: string,
        ip?: string,
        deviceId?: string,
    ) {
        const redis = this.redisService.client;

        const key = this.redisService.buildRedisRateLimitKey(type, userId, ip, deviceId);

        const count = await redis.incr(key);

        if (count === 1) {
            await redis.expire(key, RATE_LIMIT.IP.TTL_SECONDS);
        }

        return {
            allowed: count <= RATE_LIMIT.IP.LIMIT,
            currentCount: count,
            remaining: Math.max(0, RATE_LIMIT.IP.LIMIT - count),
        };
    }
}
