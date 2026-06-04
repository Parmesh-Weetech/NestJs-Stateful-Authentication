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

@Module({
  imports: [
    UserModule,

    PassportModule.register({
      session: true,
    }),

    TypeOrmModule.forFeature([
      UserSession,
    ]),

    RedisModule,
    DeviceModule
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    SessionService,
    LocalStrategy,
    SessionSerializer,
  ],
  exports: [SessionService, AuthService]
})
export class AuthModule { }