import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RateLimitService } from '../rate-limit.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;
    const ip = (await this.authService.getPublicIp()) || request.ip;
    const deviceId = request.deviceId;
    const fingerPrintId = request.deviceFingerprint;

    const ipResult = await this.rateLimitService.checkIpLimit(ip);

    const userResult = await this.rateLimitService.checkUserLimit(user.id);

    const deviceProtectionResult =
      await this.rateLimitService.checkDeviceProtection(
        deviceId,
        fingerPrintId,
      );

    const sessionResult = await this.rateLimitService.checkSessionLimit(
      user.id,
      request.session.id,
    );

    const dailyLImitResult = await this.rateLimitService.checkDailyLimit(user);

    if (
      !ipResult.allowed ||
      !userResult.allowed ||
      !deviceProtectionResult.allowed ||
      !sessionResult.allowed ||
      !dailyLImitResult.allowed
    ) {
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
