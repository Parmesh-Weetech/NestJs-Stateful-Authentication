import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [RedisModule, AuthModule],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
