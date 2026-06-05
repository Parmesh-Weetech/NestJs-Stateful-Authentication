import { Strategy } from 'passport-local';

import { PassportStrategy } from '@nestjs/passport';

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from '../auth.service';

import { Request } from 'express';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, password: string) {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Your account has been deactivated. Please contact your administrator',
      );
    }

    if (user.isTwoFactorAuthenticationEnabled) {
      const otp = req.body.otp;
      if (!otp) {
        throw new BadRequestException('OTP is required');
      }

      const isOtpValid = await this.authService.verifyOtp(user, otp);

      if (!isOtpValid) {
        throw new BadRequestException('Invalid OTP');
      }
    }

    return user;
  }
}
