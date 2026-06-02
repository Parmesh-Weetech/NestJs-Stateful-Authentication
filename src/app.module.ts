import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';

import { UserModule } from './user/user.module';

import { User } from './user/entities/user.entity';

import { UserSession } from './auth/entities/user-session.entity';
import { RedisModule } from './redis/redis.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SessionActivityInterceptor } from './common/interceptors/session-activity.interceptor';

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

      entities: [
        User,
        UserSession,
      ],

      synchronize: true,
    }),

    AuthModule,
    UserModule,
    RedisModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionActivityInterceptor
    }
  ]
})
export class AppModule { }