import { Injectable, UnauthorizedException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { IsNull, Not, Repository } from 'typeorm';

import { UserSession } from './entities/user-session.entity';
import { RedisService } from 'src/redis/redis.service';
import { SessionInvalidationReason } from './types/invalidation_reason.type';

@Injectable()
export class SessionService {
    constructor(
        @InjectRepository(UserSession)
        private readonly sessionRepository: Repository<UserSession>,

        private readonly redisService: RedisService,
    ) {}

    async createSession(data: Partial<UserSession>) {
        const session =
            this.sessionRepository.create(data);

        return this.sessionRepository.save(session);
    }

    async findSessionByUserAndDeviceId(
        userId: string,
        deviceId: string,
    ) {
        return this.sessionRepository.findOne({
            where: {
                userId,
                deviceId,
                isValid: true,
            },
        });
    }

    async findSessionBySessionId(sessionId: string) {
        return this.sessionRepository.findOne({
            where: {
                sessionId,
                isValid: true,
            },
        });
    }

    async isSessionActive(sessionId: string) {
        const session = await this.findSessionBySessionId(sessionId);

        if (!session) {
            return false;
        }

        if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
            return false;
        }

        return true;
    }

    async findSessionByUserIdAndType(
        userId: string,
        type: 'active' | 'inactive' | 'both',
    ) {
        switch (type) {
            case 'active':
                return this.sessionRepository.find({
                    where: {
                        userId,
                        isValid: true,
                    },
                    order: { createdAt: 'DESC' },
                });

            case 'inactive':
                return this.sessionRepository.find({
                    where: {
                        userId,
                        isValid: false,
                    },
                    order: { createdAt: 'DESC' },
                });

            case 'both':
                return this.sessionRepository.find({
                    where: {
                        userId,
                    },
                    order: { createdAt: 'DESC' },
                });
        }
    }

    async invalidateSessionBySessionId(sessionId: string, invalidationReason: SessionInvalidationReason) {
        await this.sessionRepository.update(
            {
                sessionId,
                isValid: true,
            },
            {
                isValid: false,
                invalidatedAt: new Date(),
                invalidationReason
            },
        );
    }

    async touchSession(sessionId: string) {
        const now = new Date();

        await this.sessionRepository.update(
            {
                sessionId,
                isValid: true,
            },
            {
                lastActivityAt: now,
            },
        );

        await this.redisService.refreshRedisSession(sessionId);
    }

    async updateDeviceFingerprint(
        sessionId: string,
        deviceFingerprint: string,
    ) {
        await this.sessionRepository.update(
            {
                sessionId,
                isValid: true,
            },
            {
                deviceFingerprint,
            },
        );
    }

    async checkDeviceFingerprintExists(sessionId: string, userId: string) {
        const session = await this.sessionRepository.findOne({
            where: {
                sessionId,
                userId,
                isValid: true,
                deviceFingerprint: Not(IsNull())
            }
        })

        if(session) {
            return true;
        }

        return false;
    }
}
