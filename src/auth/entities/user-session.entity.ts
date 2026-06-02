import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

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

    @Column({
        nullable: true,
    })
    deviceId: string;

    @Column({
        nullable: true,
    })
    ipAddress: string;

    @Column({
        nullable: true,
    })
    userAgent: string;

    @Column({
        default: true,
    })
    isValid: boolean;

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
        nullable: true,
    })
    invalidatedAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}