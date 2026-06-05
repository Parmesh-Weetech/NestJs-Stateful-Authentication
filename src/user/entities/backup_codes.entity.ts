import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('backup_codes')
export class BackUpCodes {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column()
  isUsed: boolean = false;

  @Column({
    nullable: true,
  })
  usedAt: Date;

  @ManyToOne(() => User, (user) => user.backupCodes, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({
    name: 'userId',
  })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
