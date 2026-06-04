import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RateLimitService } from '../rate-limit.service';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly authService: AuthService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const endpoint = request.url;

    if (endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register')) {
      return true;
    }

    const user = request.user;
    const ip = request.headers['x-forwarded-for']?.split(',')[0] || request.ip;
    const deviceId = request.deviceId;
    const fingerPrintId = request.deviceFingerprint;

    const ipResult = await this.rateLimitService.checkIpLimit(
      ip,
    );

    const userResult = await this.rateLimitService.checkUserLimit(
      user.id,
    )

    const deviceProtectionResult = await this.rateLimitService.checkDeviceProtection(
      deviceId,
      fingerPrintId
    )

    const sessionResult = await this.rateLimitService.checkSessionLimit(
      user.id,
      request.session.id
    )

    if (!ipResult.allowed || !userResult.allowed || !deviceProtectionResult.allowed || !sessionResult.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          message: 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const checkFingerprintExists = await this.authService.checkDeviceFingerprintExists(request.sessionID, user.id);

    if (!checkFingerprintExists) {
      await this.authService.updateDeviceFingerprint(request.sessionID, fingerPrintId);
    }

    return true;
  }
}
