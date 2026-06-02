import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSession } from '../entities/user-session.entity';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
    constructor(
        @InjectRepository(UserSession)
        private readonly sessionRepository: Repository<UserSession>,
    ) {}

    async canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();

        if (!req.isAuthenticated?.()) {
            throw new UnauthorizedException(
                'Not authenticated (passport)',
            );
        }

        const sessionId = req.sessionID;

        const session = await this.sessionRepository.findOne({
            where: {
                sessionId,
                isValid: true,
            },
        });

        if (!session) {
            throw new UnauthorizedException(
                'Session invalid or expired',
            );
        }

        // attach session for later use (optional but useful)
        req.dbSession = session;

        return true;
    }
}