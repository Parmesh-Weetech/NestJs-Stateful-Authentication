import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { BackUpCodes } from './entities/backup_codes.entity';

import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(BackUpCodes)
    private readonly backUpCodesRepository: Repository<BackUpCodes>,
  ) {}

  async findByEmail(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    return this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
  }

  async findById(id: string) {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async create(data: Partial<User>) {
    const user = this.userRepository.create(data);

    return this.userRepository.save(user);
  }

  async update2FASecret(secret: string, userId: string): Promise<boolean> {
    const user = await this.findById(userId);

    if (user?.isTwoFactorAuthenticationEnabled) {
      throw new BadRequestException('2FA secret already exists');
    }

    const updateUser = await this.userRepository.update(userId, {
      twoFactorSecret: secret,
    });

    if (updateUser.affected === 0) {
      return false;
    }

    return true;
  }

  async enable2FA(userId: string): Promise<boolean> {
    const update2FA = await this.userRepository.update(userId, {
      isTwoFactorAuthenticationEnabled: true,
    });

    if (update2FA.affected === 0) {
      return false;
    }

    return true;
  }

  async disable2FA(userId: string): Promise<boolean> {
    const update2FA = await this.userRepository.update(userId, {
      isTwoFactorAuthenticationEnabled: false,
      twoFactorSecret: null,
    });

    if (update2FA.affected === 0) {
      return false;
    }

    return true;
  }

  async addBackupCodes(backupCodes: string[], userId: string) {
    for (let i = 0; i < backupCodes.length; i++) {
      const backupCode = this.backUpCodesRepository.create({
        code: backupCodes[i],
        user: { id: userId },
      });
      await this.backUpCodesRepository.save(backupCode);
    }

    return true;
  }

  async validateBackupCode(code: string, userId: string): Promise<boolean> {
    const backupCodes = await this.backUpCodesRepository.find({
      where: {
        user: { id: userId },
      },
    });

    for (const backupCode of backupCodes) {
      const isMatch = await bcrypt.compare(code, backupCode.code);

      if (backupCode.isUsed && isMatch) {
        throw new BadRequestException('Backup code is already used');
      }

      if (isMatch) {
        const result = await this.backUpCodesRepository.update(
          {
            id: backupCode.id,
            isUsed: false,
          },
          {
            isUsed: true,
            usedAt: new Date(),
          },
        );

        if (!result.affected) {
          return false;
        }

        return true;
      }
    }

    return false;
  }
}
