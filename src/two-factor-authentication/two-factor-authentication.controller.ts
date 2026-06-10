import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedGuard } from 'src/auth/guards/authenticated.guard';
import { TwoFactorAuthenticationService } from './two-factor-authentication.service';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('2fa')
export class TwoFactorAuthenticationController {
  constructor(
    private readonly twoFactorAuthenticationService: TwoFactorAuthenticationService,
  ) {}

  @UseGuards(AuthenticatedGuard)
  @Post('/setup')
  async setup(@Req() req: Request) {
    return this.twoFactorAuthenticationService.setup((req as any).user);
  }

  @UseGuards(AuthenticatedGuard)
  @Post('/verify')
  async verify(@Req() req: Request, @Body() body: { otp: string }) {
    const response = await this.twoFactorAuthenticationService.verify(
      body.otp,
      (req as any).user.id,
    );

    if (response.enabled) {
      return {
        message: '2FA successfully enabled.',
        backupCodes: response.backUpCodes,
      };
    } else {
      throw new BadRequestException('Invalid otp.');
    }
  }

  @UseGuards(AuthenticatedGuard)
  @Post('/disable')
  async disable(
    @Req() req: Request,
    @Body()
    body: {
      password: string;
      otp: string;
    },
  ) {
    return this.twoFactorAuthenticationService.disable(
      body.password,
      body.otp,
      (req as any).user,
    );
  }

  @UseGuards(AuthenticatedGuard)
  @Post('/verify/backup-code')
  async verifyBackupCode(@Req() req: Request, @Body() body: { code: string }) {
    return this.twoFactorAuthenticationService.verifyBackupCode(
      body.code,
      (req as any).user.id,
    );
  }

  @Public()
  @Post('/debug-otp/:userId')
  async debugOtp(@Param('userId') userId: string) {
    return this.twoFactorAuthenticationService.generateDebugOtp(userId);
  }
}
