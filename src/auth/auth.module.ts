import { Module } from '@nestjs/common';

import { PassportModule } from '@nestjs/passport';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';

import { AuthService } from './auth.service';

import { SessionService } from './session.service';

import { UserModule } from '../user/user.module';

import { LocalStrategy } from './strategies/local.strategy';

import { SessionSerializer } from './session.serializer';

import { UserSession } from './entities/user-session.entity';
import { RedisModule } from 'src/redis/redis.module';
import { DeviceModule } from 'src/device/device.module';
import { RateLimitModule } from 'src/rate-limit/rate-limit.module';
import { forwardRef } from '@nestjs/common';
import { TwoFactorAuthenticationModule } from 'src/two-factor-authentication/two-factor-authentication.module';

@Module({
  imports: [
    UserModule,

    PassportModule.register({
      session: true,
    }),

    TypeOrmModule.forFeature([UserSession]),

    RedisModule,
    DeviceModule,
    forwardRef(() => RateLimitModule),
    forwardRef(() => TwoFactorAuthenticationModule),
  ],

  controllers: [AuthController],

  providers: [AuthService, SessionService, LocalStrategy, SessionSerializer],
  exports: [SessionService, AuthService],
})
export class AuthModule {}
