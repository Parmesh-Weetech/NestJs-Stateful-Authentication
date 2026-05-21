import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

import session from 'express-session';

import passport from 'passport';

import { RedisStore } from 'connect-redis';

import { createClient } from 'redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    password: process.env.REDIS_PASSWORD,
  });

  await redisClient.connect();

  redisClient.on('connect', () => {
    console.log('Redis connected');
  });

  redisClient.on('error', (err) => {
    console.log(err);
  });

  app.use(
    session({
      store: new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 60 * 60 * 24,
      }),

      secret: process.env.SESSION_SECRET as string,

      resave: false,

      saveUninitialized: false,

      cookie: {
        maxAge: 1000 * 60 * 60 * 24,

        httpOnly: true,

        secure: false,

        sameSite: 'lax',
      },
    }),
  );

  app.use(passport.initialize());

  app.use(passport.session());

  await app.listen(3000);
}

bootstrap();