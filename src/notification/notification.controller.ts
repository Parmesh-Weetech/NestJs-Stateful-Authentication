import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { ListNotification } from './dtos/list-notification.dto';
import { AuthenticatedGuard } from 'src/auth/guards/authenticated.guard';
import { NotificationStreamService } from './notification-stream.service';
import { Observable } from 'rxjs';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('notifications')
@UseGuards(AuthenticatedGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationStreamService: NotificationStreamService,
  ) {}

  @Sse('stream')
  @Public()
  stream(@Req() req: any): Observable<MessageEvent> {
    const userId = req.user.id;

    return this.notificationStreamService.subscribe(userId);
  }

  @Post()
  async createNotification(
    @Body() createNotification: CreateNotificationDto,
  ): Promise<Notification> {
    return this.notificationService.createNotification(createNotification);
  }

  @Get(':userId')
  async getNotifications(
    @Param('userId') userId: string,
    @Query() query: ListNotification,
  ): Promise<Notification[]> {
    return this.notificationService.getNotifications(userId, query);
  }

  @Patch('read/:notificationId')
  async markAsRead(
    @Param('notificationId') notificationId: string,
  ): Promise<Notification> {
    return this.notificationService.markAsRead(notificationId);
  }

  @Patch('read/all/:userId')
  async markAllAsRead(@Param('userId') userId: string): Promise<boolean> {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':notificationId')
  async deleteNotification(
    @Param('notificationId') notificationId: string,
  ): Promise<boolean> {
    return this.notificationService.deleteNotification(notificationId);
  }

  @Delete(':userId')
  async deleteAllNotifications(
    @Param('userId') userId: string,
  ): Promise<boolean> {
    return this.notificationService.deleteAllNotifications(userId);
  }
}
