import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationStreamService } from 'src/notification/notification-stream.service';
import type { RedisClientType } from 'redis';
import { RedisService } from './redis.service';

@Injectable()
export class RedisSubscriber implements OnModuleInit {
  private subscriber: RedisClientType;

  constructor(
    private readonly redisService: RedisService,
    private readonly streamService: NotificationStreamService,
  ) {}

  async onModuleInit() {
    this.subscriber = this.redisService.getClient().duplicate();

    await this.subscriber.connect();

    await this.subscriber.subscribe('notifications', (message) => {
      const data = JSON.parse(message);

      if (this.streamService.isOnline(data.userId)) {
        this.streamService.sendToUser(data.userId, {
          createdAt: data.createdAt,
          id: data.id,
          message: data.message,
          title: data.title,
          ...data,
        });
      }
    });
  }
}
