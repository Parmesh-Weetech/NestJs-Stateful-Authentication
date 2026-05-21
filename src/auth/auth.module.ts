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

@Module({
  imports: [
    UserModule,

    PassportModule.register({
      session: true,
    }),

    TypeOrmModule.forFeature([
      UserSession,
    ]),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    SessionService,
    LocalStrategy,
    SessionSerializer,
  ],
})
export class AuthModule { }