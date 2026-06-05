import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import speakeasy from 'speakeasy';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class TwoFactorAuthenticationService {
  constructor(private readonly userService: UserService) {}

  async setup(user: User) {
    const enabled = await this.checkTwoFactorAuthenticationEnabled(user.id);

    if (enabled) {
      throw new BadRequestException('Cannot re-enable 2FA');
    }

    const secret = speakeasy.generateSecret({
      name: `2FA` + user.email,
    });

    const updateSecret = await this.userService.update2FASecret(
      secret.base32,
      user.id,
    );

    if (updateSecret) {
      return {
        secret: secret.base32,
        otpAuthUrl: secret.otpauth_url,
      };
    }

    throw new InternalServerErrorException('Failed to update 2FA secret');
  }

  async verify(otp: string, userId: string) {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestException();
    }

    const enabled = await this.checkTwoFactorAuthenticationEnabled(userId);

    if (enabled) {
      throw new BadRequestException('2FA already enabled');
    }

    const secretExists =
      await this.checkTwoFactorAuthenticationSecretExists(userId);

    if (!secretExists) {
      throw new BadRequestException('2FA secret not found');
    }

    const verified = await this.verifyOtp(user, otp);

    if (!verified) {
      throw new BadRequestException('Invalid OTP');
    }

    const enable2FA = await this.userService.enable2FA(user.id);

    if (enable2FA) {
      const backupCodes: string[] = [];

      for (let i = 0; i < 10; i++) {
        const backupCode = await this.generateBackupCode();
        backupCodes.push(backupCode);
      }

      const hashedBackupCodes = await Promise.all(
        backupCodes.map((code) =>
          bcrypt.hash(code, parseInt(process.env.BCRYPT_SALT || '12')),
        ),
      );

      await this.userService.addBackupCodes(hashedBackupCodes, user.id);
      return {
        enabled: true,
        backUpCodes: backupCodes,
      };
    }

    throw new InternalServerErrorException('Failed to enable 2FA');
  }

  async verifyOtp(user: User, otp: string) {
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret as string,
      encoding: 'base32',
      token: otp,
      window: 1,
    });

    return verified;
  }

  async checkTwoFactorAuthenticationEnabled(userId: string): Promise<boolean> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.isTwoFactorAuthenticationEnabled;
  }

  async checkTwoFactorAuthenticationSecretExists(
    userId: string,
  ): Promise<boolean> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return !!user.twoFactorSecret;
  }

  async disable(password: string, otp: string, user: User) {
    const secretExists = await this.checkTwoFactorAuthenticationSecretExists(
      user.id,
    );
    const enabled = await this.checkTwoFactorAuthenticationEnabled(user.id);

    if (!secretExists) {
      throw new BadRequestException('2FA Secret does not exist');
    }

    if (!enabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const verifyPassword = await bcrypt.compare(password, user.password);

    if (!verifyPassword) {
      throw new BadRequestException('Invalid Credentials');
    }

    await this.verifyOtp(user, otp);

    const disabled = await this.userService.disable2FA(user.id);

    if (disabled) {
      return '2FA disabled successfully';
    }

    throw new InternalServerErrorException('Failed to disable 2FA');
  }

  async generateDebugOtp(user: User) {
    const token = speakeasy.totp({
      secret: user.twoFactorSecret as string,
      encoding: 'base32',
    });

    return token;
  }

  async generateBackupCode(): Promise<string> {
    const code = randomBytes(4).toString('hex').toUpperCase();

    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }

  async verifyBackupCode(code: string, userId: string) {
    const backupCode = await this.userService.validateBackupCode(code, userId);

    if (!backupCode) {
      throw new BadRequestException('Invalid Backup Code');
    }

    return true;
  }
}
