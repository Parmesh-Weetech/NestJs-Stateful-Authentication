import { Injectable, UnauthorizedException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { FindManyOptions, Repository } from 'typeorm';

import { UserSession } from './entities/user-session.entity';

import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SessionService {

    constructor(
        @InjectRepository(UserSession)
        private readonly sessionRepository: Repository<UserSession>,

        private readonly redisService: RedisService
    ) { }

    async createSession(data: Partial<UserSession>) {
        const session =
            this.sessionRepository.create(data);

        return this.sessionRepository.save(session);
    }

    async invalidateDeviceSessions(
        userId: string,
        deviceId?: string | null,
    ) {
        if (!deviceId) {
            throw new UnauthorizedException('Device id is required!');
        }

        await this.sessionRepository.update(
            {
                userId,
                deviceId,
                isValid: true,
            },
            {
                isValid: false,
                invalidatedAt: new Date(),
            },
        );
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

    async findSessionByUserIdAndType(
        userId: string,
        type: 'active' | 'in-active' | 'both'
    ) {
        switch (type) {
            case 'active':
                return this.sessionRepository.find({
                    where: {
                        userId,
                        isValid: true,
                    },
                });

            case 'in-active':
                return this.sessionRepository.find({
                    where: {
                        userId,
                        isValid: false,
                    },
                });

            case 'both':
                return this.sessionRepository.find({
                    where: {
                        userId,
                    },
                });
        }
    }

    async invalidateSessionBySessionId(sessionId: string) {
        await this.sessionRepository.update(
            {
                sessionId,
                isValid: true,
            },
            {
                isValid: false,
                invalidatedAt: new Date(),
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
    }
}