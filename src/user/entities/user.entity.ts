import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { UserSession } from '../../auth/entities/user-session.entity';

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

    @OneToMany(
        () => UserSession,
        (session) => session.user,
    )
    sessions: UserSession[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}