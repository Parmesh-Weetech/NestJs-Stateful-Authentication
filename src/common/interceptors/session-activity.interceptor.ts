import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SessionService } from '../../auth/session.service';

@Injectable()
export class SessionActivityInterceptor
    implements NestInterceptor {
    constructor(
        private readonly sessionManager: SessionService,
    ) { }

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<any> {
        const req = context.switchToHttp().getRequest();

        return next.handle().pipe(
            tap(async () => {
                // only for authenticated users
                if (!req.isAuthenticated?.()) return;

                // safety check
                if (!req.sessionID) return;

                try {
                    await this.sessionManager.touchSession(
                        req.sessionID,
                    );
                } catch (err) {
                    // never block request if session tracking fails
                    console.error(
                        'Session touch failed:',
                        err,
                    );
                }
            }),
        );
    }
}