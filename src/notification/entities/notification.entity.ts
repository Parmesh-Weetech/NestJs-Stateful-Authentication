import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationActorType } from '../types/notification-actor.type';
import { DeliveryStatus } from '../types/delivery-status.type';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ nullable: true })
  actorId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor?: User | null;

  @Column({
    type: 'enum',
    enum: NotificationActorType,
    nullable: false,
  })
  actorType: NotificationActorType;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column()
  type: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({
    default: false,
  })
  isRead: boolean;

  @Column({ nullable: true })
  readAt?: Date;

  @Column({
    nullable: true,
  })
  deliveredAt?: Date;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    nullable: false,
    default: DeliveryStatus.PENDING,
  })
  deliveryStatus: DeliveryStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
