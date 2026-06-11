import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SendEmailType } from '../types/mail.type';

@Entity('mails')
export class Mail {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({
    type: 'varchar',
  })
  to: string;

  @Column({
    type: 'varchar',
  })
  subject: string;

  @Column({
    type: 'enum',
    enum: SendEmailType,
    default: SendEmailType.PENDING,
  })
  status: SendEmailType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
