import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserSession } from '../../auth/entities/user-session.entity';
import { UserPlan } from '../types/plan.type';
import { BackUpCodes } from './backup_codes.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
  })
  email: string;

  @Column()
  password: string;

  @Column({
    default: true,
  })
  isActive: boolean;

  @Column({
    default: false,
  })
  isTwoFactorAuthenticationEnabled: boolean;

  @Column({
    nullable: true,
    type: 'varchar',
    length: 255,
  })
  twoFactorSecret?: string | null;

  @OneToMany(() => BackUpCodes, (code) => code.user)
  backupCodes: BackUpCodes[];

  @Column({
    type: 'enum',
    enum: UserPlan,
    default: UserPlan.FREE,
  })
  plan: UserPlan;

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
