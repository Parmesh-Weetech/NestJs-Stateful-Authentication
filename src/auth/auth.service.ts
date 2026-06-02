import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { type Request } from 'express';

import * as bcrypt from 'bcrypt';

import { UserService } from '../user/user.service';
import { SessionService } from './session.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly redisService: RedisService
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
            Number(process.env.BCRYPT_SALT) || 10,
        );

        return this.userService.create({
            email: email.toLowerCase().trim(),
            password: hashedPassword,
        });
    }

    async login(
        req: Request,
        deviceId?: string | null
    ) {
        if (!deviceId) {
            throw new UnauthorizedException(
                'Device not recognized. Please login again.',
            );
        }

        const user = req.user;

        // 1. destroy old session + create new one
        await new Promise<void>((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Re-login user into NEW session
        await new Promise<void>((resolve, reject) => {
            req.login(user as Express.User, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        const existingSession = await this.sessionService.findSessionByUserAndDeviceId(
            (req.user as any).id,
            deviceId,
        );

        if (existingSession) {
            await this.sessionService.invalidateSessionBySessionId(existingSession.sessionId);
            await this.redisService.deleteRedisSession(existingSession.sessionId);
        }

        // 2. now sessionID is rotated
        await this.sessionService.createSession({
            userId: (req.user as any)?.id,
            sessionId: req.sessionID,
            deviceId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            isValid: true,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            lastActivityAt: new Date(),
        });

        return {
            message: 'Logged in',
            user: req.user,
        };
    }

    async logout(
        req: Request,
        deviceId: string
    ) {
        if (!deviceId) {
            throw new UnauthorizedException(
                'Device not recognized. Please login again.',
            );
        }

        if (!req.sessionID) {
            throw new UnauthorizedException(
                'Session not found',
            );
        }

        const existingSession = await this.sessionService.findSessionBySessionId(
            req.sessionID,
        );

        if (existingSession) {
            await this.sessionService.invalidateSessionBySessionId(
                existingSession.sessionId,
            );

            await this.redisService.deleteRedisSession(existingSession.sessionId);
        }

        // destroy express session
        await new Promise<void>((resolve, reject) => {
            req.session.destroy((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        return {
            message: 'Logged out',
        };
    }

    async listUserSessions(
        req: Request,
        type: 'active' | 'in-active' | 'both'
    ) {
        return await this.sessionService.findSessionByUserIdAndType((req.user as any)?.id, type);
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