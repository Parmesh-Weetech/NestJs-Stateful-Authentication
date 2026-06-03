import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RateLimitService } from '../rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // const user = request.user;
    const ip = request.headers['x-forwarded-for']?.split(',')[0] || request.ip;
    // const deviceId = request.headers['x-device-id'];

    const result = await this.rateLimitService.checkIpLimit(
      'ip',
      undefined,
      ip,
      undefined
    );

    if (!result.allowed) {
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
