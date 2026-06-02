import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { createRedisClient } from '../common/helper/createRedisClient';
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

    buildRedisSessionKey(sessionId: string): string {
        return `sess:${sessionId}`;
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
