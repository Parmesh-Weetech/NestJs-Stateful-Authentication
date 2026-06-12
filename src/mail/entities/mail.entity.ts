import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SendEmailType } from '../types/mail.type';

@Entity('mails_logs')
export class Mail {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_mail_jobId_unique', { unique: true })
  @Column()
  // jobId is used for idempotency; enforce uniqueness to prevent duplicate logs/jobs.
  jobId: string;

  @Column({ type: 'varchar' })
  recipient: string;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({
    type: 'enum',
    enum: SendEmailType,
    default: SendEmailType.PENDING,
  })
  status: SendEmailType;

  @Column({
    nullable: true,
    type: 'text',
  })
  failureReason: string | null;

  @Column({
    nullable: true,
  })
  processingStartAt: Date;

  @Column({
    nullable: true,
  })
  sentAt: Date;

  @Column()
  templateName: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  data: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
