import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

import session from 'express-session';

import passport from 'passport';

import { RedisStore } from 'connect-redis';

import { config } from 'dotenv';
import { RedisService } from './redis/redis.service';
import { getExpiredTime } from './common/helper/getExpiredTime';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const redisService = app.get(RedisService);

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    methods: ['POST', 'GET', 'DELETE', 'PATCH', 'PUT'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const expiredTimes = getExpiredTime();

  app.use(
    session({
      name: process.env.SESSION_COOKIE_NAME || 'session',
      store: new RedisStore({
        client: redisService.client,
        prefix: 'sess:',
        ttl: expiredTimes.seconds,
      }),
      secret: process.env.SESSION_SECRET as string,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      unset: 'destroy',
      cookie: {
        maxAge: expiredTimes.ms,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  await app.listen(Number(process.env.PORT) || 3000);
}

bootstrap();
