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

    // Subscribe to server-specific channel
    await this.subscriber.subscribe(
      `notifications:${this.streamService.serverId}`,
      async (message) => {
        const data = JSON.parse(message as string);
        console.log('Message:: ', data);

        const { notificationId, recipientId } = data;

        if (this.streamService.isOnline(recipientId)) {
          this.streamService.sendToUser(recipientId, {
            createdAt: data.notification.createdAt,
            id: data.notification.id,
            message: data.notification.message,
            title: data.notification.title,
          });

          await this.notificationService.updateNotificationStatus(
            notificationId,
            DeliveryStatus.DELIVERED,
          );
        } else {
          console.warn(
            `Local SSE connection missing for user ${recipientId} despite receiving pub/sub routing`,
          );
          // TODO: Send FCM push notification when recipient is offline.
        }
      },
    );
  }
}
