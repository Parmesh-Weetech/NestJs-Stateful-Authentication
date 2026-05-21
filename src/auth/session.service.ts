import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { UserSession } from './entities/user-session.entity';

@Injectable()
export class SessionService {
    constructor(
        @InjectRepository(UserSession)
        private readonly sessionRepository: Repository<UserSession>,
    ) { }

    async createSession(data: Partial<UserSession>) {
        const session =
            this.sessionRepository.create(data);

        return this.sessionRepository.save(session);
    }

    async invalidateSession(sessionId: string) {
        await this.sessionRepository.delete({ sessionId });
    }
}