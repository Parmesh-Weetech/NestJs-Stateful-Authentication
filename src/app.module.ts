import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';

import { UserModule } from './user/user.module';

import { User } from './user/entities/user.entity';
import { UserSession } from './auth/entities/user-session.entity';
import { BackUpCodes } from './user/entities/backup_codes.entity';
import { RedisModule } from './redis/redis.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SessionActivityInterceptor } from './common/interceptors/session-activity.interceptor';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { RateLimitGuard } from './rate-limit/guards/rate-limit.guard';
import { DeviceModule } from './device/device.module';
import { DeviceSignatureCheckGuard } from './device/guards/device-signature-check.guard';
import { GeoModule } from './geo/geo.module';
import { TwoFactorAuthenticationModule } from './two-factor-authentication/two-factor-authentication.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',

      host: process.env.DB_HOST,

      port: Number(process.env.DB_PORT),

      username: process.env.DB_USERNAME,

      password: process.env.DB_PASSWORD,

      database: process.env.DB_NAME,

      entities: [User, UserSession, BackUpCodes],

      synchronize: true,
    }),

    AuthModule,
    UserModule,
    RedisModule,
    RateLimitModule,
    DeviceModule,
    GeoModule,
    TwoFactorAuthenticationModule,
    MailModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionActivityInterceptor,
    },
    // {
    //   provide: APP_GUARD,
    //   useClass: DeviceSignatureCheckGuard
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: RateLimitGuard
    // }
  ],
})
export class AppModule {}
