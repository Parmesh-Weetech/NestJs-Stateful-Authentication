import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';

import { type Request } from 'express';

import * as bcrypt from 'bcrypt';

import { UserService } from '../user/user.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly sessionService: SessionService
    ) { }

    async register(
        email: string,
        password: string,
    ) {
        const existingUser =
            await this.userService.findByEmail(email);

        if (existingUser) {
            throw new BadRequestException(
                'User already exists',
            );
        }

        const hashedPassword = await bcrypt.hash(
            password,
            10,
        );

        return this.userService.create({
            email,
            password: hashedPassword,
        });
    }

    async login(
        req: Request
    ) {
        // 1. destroy old session + create new one
        await new Promise<void>((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // 2. now sessionID is rotated
        await this.sessionService.createSession({
            userId: (req.user as any)?.id,
            sessionId: req.sessionID,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            lastActivityAt: new Date(),
        });

        return {
            message: 'Logged in',
            user: req.user,
        };
    }

    async validateUser(
        email: string,
        password: string,
    ) {
        const user =
            await this.userService.findByEmail(email);

        if (!user) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password,
        );

        if (!isPasswordValid) {
            return null;
        }

        return user;
    }
}