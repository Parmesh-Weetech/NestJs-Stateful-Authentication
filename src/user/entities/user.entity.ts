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

  @Column({
    nullable: true,
    type: 'varchar',
  })
  twoFactorBackupCodes?: string[] | null;

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
