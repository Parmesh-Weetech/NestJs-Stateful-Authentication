import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

import session from 'express-session';

import passport from 'passport';

import { RedisStore } from 'connect-redis';

import { config } from 'dotenv';
import { RedisService } from './redis/redis.service';

config();

const sessionLifetimeMs = Number(process.env.SESSION_TTL_MS) || 1000 * 60 * 60 * 24;
const sessionLifetimeSeconds = Math.floor(sessionLifetimeMs / 1000);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redisService = app.get(RedisService);

  app.set('trust proxy', 1);

  app.use(
    session({
      name: process.env.SESSION_COOKIE_NAME || 'session',
      store: new RedisStore({
        client: redisService.client,
        prefix: 'sess:',
        ttl: sessionLifetimeSeconds,
      }),
      secret: process.env.SESSION_SECRET as string,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      unset: 'destroy',
      cookie: {
        maxAge: sessionLifetimeMs,
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
