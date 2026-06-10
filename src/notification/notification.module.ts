import { Module, forwardRef } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationStreamService } from './notification-stream.service';
import { AuthModule } from 'src/auth/auth.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    forwardRef(() => AuthModule),
    forwardRef(() => RedisModule),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationStreamService],
  exports: [NotificationService, NotificationStreamService],
})
export class NotificationModule {}
