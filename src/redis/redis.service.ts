import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { createRedisClient } from './helper/createRedisClient';
import { getExpiredTime } from '../common/helper/getExpiredTime';

import type { RedisClientType } from 'redis';

@Injectable()
export class RedisService
    implements OnModuleInit, OnModuleDestroy
{
    client: RedisClientType;

    constructor() {
        this.client = createRedisClient();
    }

    async onModuleInit() {
        this.client.on('connect', () => {
            console.log('Redis connected');
        });

        this.client.on('error', (err) => {
            console.log(err);
        });

        await this.client.connect();
    }

    async onModuleDestroy() {
        await this.client.quit();
    }

    getClient(): RedisClientType {
        if (!this.client) {
            this.client = createRedisClient();
        }
        return this.client;
    }

    buildRedisSessionKey(sessionId: string): string {
        return `sess:${sessionId}`;
    }

    buildRedisRateLimitKey(type: 'ip' | 'user' | 'ip:user' | 'device' | 'user:device', userId?: string, ip?: string, deviceId?: string): string {
        switch (type) {
            case 'ip':
                if (!ip) {
                    throw new Error('IP is required for IP rate limit');
                }
                return `rate-limit:ip:${ip}`;
            case 'user':
                if (!userId) {
                    throw new Error('User ID is required for user rate limit');
                }
                return `rate-limit:user:${userId}`;
            case 'ip:user':
                if (!ip || !userId) {
                    throw new Error('IP and user ID are required for IP:User rate limit');
                }
                return `rate-limit:ip:${ip}:user:${userId}`;
            case 'device':
                if (!deviceId) {
                    throw new Error('Device ID is required for device rate limit');
                }
                return `rate-limit:device:${deviceId}`;
            case 'user:device':
                if (!userId || !deviceId) {
                    throw new Error('User ID and device ID are required for User:Device rate limit');
                }
                return `rate-limit:user:${userId}:device:${deviceId}`;
            default:
                throw new Error('Invalid rate limit type');
        }
    }

    async refreshRedisSession(sessionId: string): Promise<void> {
        const expiredTime = getExpiredTime();
        const key = this.buildRedisSessionKey(sessionId);
        const value = await this.client.get(key);

        if (!value) {
            return;
        }

        await this.client.set(key, value, {
            EX: expiredTime.seconds,
        });
    }

    async getRedisSession(sessionId: string): Promise<string | null> {
        const key = await this.buildRedisSessionKey(sessionId);
        return await this.client.get(key);
    }

    async deleteRedisSession(sessionId: string): Promise<void> {
        const key = await this.buildRedisSessionKey(sessionId);
        await this.client.del(key);
    }
}
