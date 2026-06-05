import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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
    await this.twoFactorAuthenticationService.verify(
      body.otp,
      (req as any).user.id,
    );

    return '2FA successfully enabled.';
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

  @Public()
  @Post('/debug-otp')
  async debugOtp(@Req() req: Request) {
    return this.twoFactorAuthenticationService.generateDebugOtp(
      (req as any).user,
    );
  }
}
