import { forwardRef, Module } from '@nestjs/common';
import { TwoFactorAuthenticationController } from './two-factor-authentication.controller';
import { TwoFactorAuthenticationService } from './two-factor-authentication.service';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [TwoFactorAuthenticationController],
  providers: [TwoFactorAuthenticationService],
  imports: [UserModule, forwardRef(() => AuthModule)],
  exports: [TwoFactorAuthenticationService],
})
export class TwoFactorAuthenticationModule {}
