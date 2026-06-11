import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationStreamService } from 'src/notification/notification-stream.service';
import type { RedisClientType } from 'redis';
import { RedisService } from './redis.service';
import { NotificationService } from 'src/notification/notification.service';
import { DeliveryStatus } from 'src/notification/types/delivery-status.type';

@Injectable()
export class RedisSubscriber implements OnModuleInit {
  private subscriber: RedisClientType;

  constructor(
    private readonly redisService: RedisService,
    private readonly streamService: NotificationStreamService,
    private readonly notificationService: NotificationService,
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

        this.notificationService.updateNotificationStatus(
          data.id,
          DeliveryStatus.DELIVERED,
        );
      }

      this.notificationService.updateNotificationStatus(
        data.id,
        DeliveryStatus.SENT,
      );
    });
  }
}
