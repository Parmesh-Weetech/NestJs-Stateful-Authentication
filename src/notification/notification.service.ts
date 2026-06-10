import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ListNotification } from './dtos/list-notification.dto';
import { NotificationStreamService } from './notification-stream.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    private readonly notificationSseService: NotificationStreamService,
  ) {}

  async createNotification(
    createNotification: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...createNotification,
      isRead: false,
    });
    const savedNotification =
      await this.notificationRepository.save(notification);

    this.notificationSseService.sendToUser(
      savedNotification.recipientId,
      savedNotification,
    );
    return savedNotification;
  }

  async getNotifications(
    userId: string,
    query: ListNotification,
  ): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: { recipient: { id: userId }, isRead: query.isRead ?? false },
      relations: { recipient: true, actor: true },
      order: { createdAt: 'DESC' },
      take: query.limit ?? 10,
      skip: query.offset ?? 0,
    });
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new Error('Notification not found');
    }
    notification.isRead = true;
    notification.readAt = new Date();
    return await this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    const affectedRows = await this.notificationRepository.update(
      { recipient: { id: userId }, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    if (affectedRows.affected && affectedRows.affected > 0) {
      return true;
    }
    return false;
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    const affectedRows =
      await this.notificationRepository.delete(notificationId);
    if (affectedRows.affected && affectedRows.affected > 0) {
      return true;
    }
    return false;
  }

  async deleteAllNotifications(userId: string): Promise<boolean> {
    const affectedRows = await this.notificationRepository.delete({
      recipient: { id: userId },
    });
    if (affectedRows.affected && affectedRows.affected > 0) {
      return true;
    }
    return true;
  }
}
