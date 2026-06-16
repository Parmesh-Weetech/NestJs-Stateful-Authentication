import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';

import { LocalAuthGuard } from './guards/local-auth.guard';

import { AuthenticatedGuard } from './guards/authenticated.guard';
import { DeviceSignatureCheckGuard } from 'src/device/guards/device-signature-check.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { LoginRateLimitGuard } from 'src/rate-limit/guards/login-rate-limit.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.plan);
  }

  @Public()
  @UseGuards(LoginRateLimitGuard, LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-device-id') deviceId?: string,
  ): Promise<{
    message: string;
    user: Express.User | undefined;
  }> {
    const response = await this.authService.login(req, deviceId || null);

    res.setHeader('x-device-id', deviceId || '');
    res.setHeader('x-device-signature', response.signature);

    return {
      message: response.message,
      user: response.user,
    };
  }

  @UseGuards(AuthenticatedGuard, DeviceSignatureCheckGuard)
  @Get('me')
  me(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(AuthenticatedGuard, DeviceSignatureCheckGuard)
  @Get('sessions')
  async listSessions(
    @Req() req: Request,
    @Query('type') type: 'active' | 'inactive' | 'both' = 'active',
  ) {
    return await this.authService.listUserSessions(req, type);
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Headers('X-Device-Id') deviceId: string) {
    return await this.authService.logout(req, deviceId as string);
  }

  @Post('/change-secret')
  async changeSecret() {
    return await this.authService.changeSecret();
  }
}
