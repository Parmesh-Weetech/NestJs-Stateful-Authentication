import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
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
            mergeMap((result) => {
                if (!req.isAuthenticated?.() || !req.sessionID) {
                    return of(result);
                }

                return from(this.sessionManager.touchSession(req.sessionID)).pipe(
                    catchError((err) => {
                        console.error('Session touch failed:', err);
                        return of(null);
                    }),
                    mergeMap(() => of(result)),
                );
            }),
        );
    }
}
