import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

import session from 'express-session';

import passport from 'passport';

import { RedisStore } from 'connect-redis';

import { config } from 'dotenv';
import { RedisService } from './redis/redis.service';

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redisService = app.get(RedisService);

  app.use(
    session({
      name: 'session',
      store: new RedisStore({
        client: redisService.client,
        prefix: 'sess:',
        ttl: 60 * 60 * 24,
      }),

      secret: process.env.SESSION_SECRET as string,

      resave: false,

      saveUninitialized: false,

      cookie: {
        maxAge: 1000 * 60 * 60 * 24,

        httpOnly: true,

        secure: process.env.NODE_ENV === 'production',

        sameSite: 'lax',

        path: '/'
      },
    }),
  );

  app.use(passport.initialize());

  app.use(passport.session());

  await app.listen(3000);
}

bootstrap();