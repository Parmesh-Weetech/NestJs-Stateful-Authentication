import { forwardRef, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisPublisher } from './redis.publisher';
import { RedisSubscriber } from './redis.subscriber';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  providers: [RedisService, RedisPublisher, RedisSubscriber],
  exports: [RedisService, RedisPublisher, RedisSubscriber],
  imports: [forwardRef(() => NotificationModule)],
})
export class RedisModule {}
