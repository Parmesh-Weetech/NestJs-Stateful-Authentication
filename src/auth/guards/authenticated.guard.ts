import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { SessionService } from '../session.service';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
    constructor(
        private readonly sessionService: SessionService,
    ) {}

    async canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();

        if (!req.isAuthenticated?.()) {
            throw new UnauthorizedException(
                'Not authenticated (passport)',
            );
        }

        if (!req.sessionID) {
            throw new UnauthorizedException(
                'Session not found',
            );
        }

        const session = await this.sessionService.findSessionBySessionId(req.sessionID);

        if (!session || !(await this.sessionService.isSessionActive(req.sessionID))) {
            throw new UnauthorizedException(
                'Session invalid or expired',
            );
        }

        req.dbSession = session;

        return true;
    }
}