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
import { DeviceService } from 'src/device/device.service';
import { DeviceMetadataService } from 'src/device/device-metadata.service';
import { SessionInvalidationReason } from './types/invalidation_reason.type';
import { UserPlan } from 'src/user/types/plan.type';
import { TwoFactorAuthenticationService } from 'src/two-factor-authentication/two-factor-authentication.service';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly redisService: RedisService,
    private readonly deviceMetadataService: DeviceMetadataService,
    private readonly deviceService: DeviceService,
    private readonly twoFactorAuthenticationService: TwoFactorAuthenticationService,
  ) {}

  async register(email: string, password: string, plan?: UserPlan) {
    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_SALT) || 12,
    );

    return this.userService.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      plan,
    });
  }

  async login(req: Request, deviceId?: string | null) {
    if (!deviceId) {
      throw new UnauthorizedException(
        'Device not recognized. Please login again.',
      );
    }

    const user = req.user;

    const previousSession =
      await this.sessionService.findSessionByUserAndDeviceId(
        (user as any).id,
        deviceId,
      );

    if (previousSession) {
      await this.sessionService.invalidateSessionBySessionId(
        previousSession.sessionId,
        SessionInvalidationReason.RE_LOGIN,
      );
      await this.redisService.deleteRedisSession(previousSession.sessionId);
    }

    const publicIp = await this.getPublicIp();

    const deviceMetadata = await this.deviceMetadataService.extract(
      req.hostname === 'localhost'
        ? publicIp
        : (req.ip! ?? req.socket.remoteAddress!),
      req.headers['user-agent'] as string,
    );

    if (!deviceMetadata) {
      throw new BadRequestException(
        'Device not recognized. Please login again.',
      );
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

    const signature = this.deviceService.generateSignature(
      deviceId,
      req.sessionID,
    );

    const expiredTimes = getExpiredTime();

    await this.sessionService.createSession({
      userId: (req.user as any)?.id,
      sessionId: req.sessionID,
      deviceId,
      deviceFingerprint: this.deviceService.generateFingerprint(
        deviceId,
        req.headers['user-agent'] as string,
      ),
      ipAddress:
        req.hostname === 'localhost'
          ? publicIp
          : (req.ip! ?? req.socket.remoteAddress!),
      userAgent: req.headers['user-agent'],
      isValid: true,
      expiresAt: new Date(Date.now() + expiredTimes.ms),
      lastActivityAt: new Date(),
      asn: deviceMetadata.geoLocationInfo.asn,
      browser: deviceMetadata.userAgentInfo.browser,
      deviceType: deviceMetadata.userAgentInfo.deviceType,
      os: deviceMetadata.userAgentInfo.os,
      city: deviceMetadata.geoLocationInfo.city,
      country: deviceMetadata.geoLocationInfo.country,
      state: deviceMetadata.geoLocationInfo.state,
      browserVersion: deviceMetadata.userAgentInfo.browserVersion,
      continent: deviceMetadata.geoLocationInfo.continent,
      deviceName: deviceMetadata.userAgentInfo.deviceName,
      organization: deviceMetadata.geoLocationInfo.organization,
      osVersion: deviceMetadata.userAgentInfo.osVersion,
    });

    return {
      message: 'Logged in',
      user: req.user,
      signature,
    };
  }

  async logout(req: Request, deviceId: string) {
    if (!deviceId) {
      throw new UnauthorizedException(
        'Device not recognized. Please login again.',
      );
    }

    if (!req.sessionID) {
      throw new UnauthorizedException('Session not found');
    }

    const existingSession = await this.sessionService.findSessionBySessionId(
      req.sessionID,
    );

    if (existingSession) {
      await this.sessionService.invalidateSessionBySessionId(
        existingSession.sessionId,
        SessionInvalidationReason.LOGOUT,
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
      throw new InternalServerErrorException(
        'Internal Server Error while logging out!',
      );
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

  async listUserSessions(req: Request, type: 'active' | 'inactive' | 'both') {
    return await this.sessionService.findSessionByUserIdAndType(
      (req.user as any)?.id,
      type,
    );
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async getPublicIp() {
    const response = await fetch('https://api.ipify.org?format=json');

    const data = await response.json();

    return data.ip;
  }

  async updateDeviceFingerprint(sessionId: string, deviceFingerprint: string) {
    await this.sessionService.updateDeviceFingerprint(
      sessionId,
      deviceFingerprint,
    );
  }

  async checkDeviceFingerprintExists(sessionId: string, userId: string) {
    return await this.sessionService.checkDeviceFingerprintExists(
      sessionId,
      userId,
    );
  }

  async verifyOtp(user: User, otp: string) {
    return await this.twoFactorAuthenticationService.verifyOtp(user, otp);
  }
}
