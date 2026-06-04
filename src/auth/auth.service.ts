import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';

import { type Request } from 'express';

import * as bcrypt from 'bcrypt';

import { UserService } from '../user/user.service';
import { SessionService } from './session.service';
import { RedisService } from 'src/redis/redis.service';
import { getExpiredTime } from 'src/common/helper/getExpiredTime';
import { createHmac } from 'node:crypto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly redisService: RedisService,
    ) {}

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
        deviceId?: string | null,
    ) {
        if (!deviceId) {
            throw new UnauthorizedException(
                'Device not recognized. Please login again.',
            );
        }

        const signature = createHmac('sha256', process.env.FINGERPRINT_SECRET!)
            .update(deviceId)
            .digest('hex');

        if(!signature) {
            throw new BadRequestException('Cannot verify device');
        }

        const user = req.user;

        const previousSession = await this.sessionService.findSessionByUserAndDeviceId(
            (user as any).id,
            deviceId,
        );

        if (previousSession) {
            await this.sessionService.invalidateSessionBySessionId(previousSession.sessionId);
            await this.redisService.deleteRedisSession(previousSession.sessionId);
        }

        await new Promise<void>((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        await new Promise<void>((resolve, reject) => {
            req.login(user as Express.User, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        const expiredTimes = getExpiredTime();

        await this.sessionService.createSession({
            userId: (req.user as any)?.id,
            sessionId: req.sessionID,
            deviceId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            isValid: true,
            expiresAt: new Date(Date.now() + expiredTimes.ms),
            lastActivityAt: new Date(),
        });

        return {
            message: 'Logged in',
            user: req.user,
            signature
        };
    }

    async logout(
        req: Request,
        deviceId: string,
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

        try {
            await new Promise<void>((resolve, reject) => {
                req.logout((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        } catch (error) {
            console.log(error);
            throw new InternalServerErrorException('Internal Server Error while logging out!');
        }

        if (req.session) {
            await new Promise<void>((resolve, reject) => {
                req.session.destroy((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        }

        return {
            message: 'Logged out',
        };
    }

    async listUserSessions(
        req: Request,
        type: 'active' | 'inactive' | 'both',
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

