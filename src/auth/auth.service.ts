import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
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