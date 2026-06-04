import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Inject, forwardRef } from '@nestjs/common';
import { RateLimitService } from '../rate-limit.service';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const email = request.body?.email;
    if (!email) {
      return true;
    }

    const ip = await this.authService.getPublicIp() || request.ip;
    const deviceId = request.headers['x-device-id'];

    if (!deviceId) {
       return true;
    }

    const result = await this.rateLimitService.checkLoginLimit(email, ip, deviceId);

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          message: result.reason || 'Too many login attempts. Please try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
