import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
}
