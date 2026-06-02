import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from './entities/user.entity';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

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
}