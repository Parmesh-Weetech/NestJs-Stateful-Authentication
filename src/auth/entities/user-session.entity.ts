import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { SessionInvalidationReason } from '../types/invalidation_reason.type';
import { DeviceType } from '../types/device.type';

@Entity('user_sessions')
export class UserSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column()
    userId: string;

    @ManyToOne(
        () => User,
        (user) => user.sessions,
        {
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({
        name: 'userId',
    })
    user: User;

    @Index({
        unique: true,
    })
    @Column()
    sessionId: string;

    @Index()
    @Column({
        nullable: true,
    })
    deviceId: string;

    @Column({
        nullable: true,
    })
    ipAddress: string;

    @Index()
    @Column({
        nullable: true,
    })
    deviceFingerprint: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    continent: string;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    browser: string | null;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    browserVersion: string | null;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    os: string | null;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    osVersion: string | null;

    @Column({
        type: 'varchar',
        length: 500,
        nullable: true,
    })
    userAgent: string;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    deviceName: string | null;

    @Column({
        type: 'enum',
        enum: DeviceType,
        nullable: true,
    })
    deviceType: DeviceType | null;

    @Column({ nullable: true })
    asn: string;

    @Column({ nullable: true })
    organization: string;

    @Column({
        default: true,
    })
    isValid: boolean;

    @Index()
    @Column({
        type: 'timestamp',
    })
    expiresAt: Date;

    @Column({
        type: 'timestamp',
        nullable: true,
    })
    lastActivityAt: Date;

    @Column({
        type: 'timestamp',
        nullable: true,
    })
    invalidatedAt: Date | null;

    @Column({
        type: 'enum',
        enum: SessionInvalidationReason,
        nullable: true,
    })
    invalidationReason: SessionInvalidationReason | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}