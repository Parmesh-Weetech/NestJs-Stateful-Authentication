import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RateLimitService } from '../rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const endpoint = request.url;

    if (endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register')) {
      return true;
    }

    const user = request.user;
    const ip = request.headers['x-forwarded-for']?.split(',')[0] || request.ip;
    const deviceId = request.headers['x-device-id'];
    const fingerPrintId = request.headers['x-fingerprint'];

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

    if (!ipResult.allowed || !userResult.allowed || !deviceProtectionResult.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          message: 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
