import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from 'src/auth/auth.module';
import { forwardRef } from '@nestjs/common';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';

@Module({
  imports: [RedisModule, forwardRef(() => AuthModule)],
  providers: [RateLimitService, LoginRateLimitGuard],
  exports: [RateLimitService, LoginRateLimitGuard],
})
export class RateLimitModule {}
