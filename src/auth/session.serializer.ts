import { Injectable } from '@nestjs/common';

import { PassportSerializer } from '@nestjs/passport';

import { UserService } from '../user/user.service';

@Injectable()
export class SessionSerializer
    extends PassportSerializer {
    constructor(
        private readonly userService: UserService,
    ) {
        super();
    }

    serializeUser(user: any, done: Function) {
        done(null, user.id);
    }

    async deserializeUser(
        userId: string,
        done: Function,
    ) {
        const user =
            await this.userService.findById(userId);

        done(null, user);
    }
}