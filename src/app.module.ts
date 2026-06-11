import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';

import { UserModule } from './user/user.module';

import { User } from './user/entities/user.entity';
import { UserSession } from './auth/entities/user-session.entity';
import { BackUpCodes } from './user/entities/backup_codes.entity';
import { RedisModule } from './redis/redis.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SessionActivityInterceptor } from './common/interceptors/session-activity.interceptor';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { DeviceModule } from './device/device.module';
import { GeoModule } from './geo/geo.module';
import { TwoFactorAuthenticationModule } from './two-factor-authentication/two-factor-authentication.module';
import { MailModule } from './mail/mail.module';
import { NotificationModule } from './notification/notification.module';
import { Notification } from './notification/entities/notification.entity';
import { BullModule } from '@nestjs/bullmq';
import { Mail } from './mail/entities/mail.entity';

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

      entities: [User, UserSession, BackUpCodes, Notification, Mail],

      synchronize: true,
    }),

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    }),

    BullModule.registerQueue({
      name: 'EMAIL_QUEUE',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    }),

    AuthModule,
    UserModule,
    RedisModule,
    RateLimitModule,
    DeviceModule,
    GeoModule,
    TwoFactorAuthenticationModule,
    MailModule,
    NotificationModule,
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
