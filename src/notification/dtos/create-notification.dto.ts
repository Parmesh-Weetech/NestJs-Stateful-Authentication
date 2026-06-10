import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotificationActorType } from '../types/notification-actor.type';

export class CreateNotificationDto {
  @IsString()
  @IsUUID()
  recipientId: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsEnum(NotificationActorType)
  actorType: NotificationActorType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  metadata?: Record<string, any>;
}
