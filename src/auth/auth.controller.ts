import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';

import { LocalAuthGuard } from './guards/local-auth.guard';

import { AuthenticatedGuard } from './guards/authenticated.guard';

import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly sessionService: SessionService,
    ) { }

    @Post('register')
    async register(
        @Body() dto: RegisterDto,
    ) {
        return this.authService.register(
            dto.email,
            dto.password,
        );
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Req() req: Request): Promise<{
        message: string,
        user: Express.User | undefined
    }> {
        return await this.authService.login(req)
    }

    @UseGuards(AuthenticatedGuard)
    @Get('me')
    me(@Req() req: Request) {
        return req.user;
    }

    @Post('logout')
    async logout(
        @Req() req: Request,
        @Res() res: Response,
    ) {
        await this.sessionService.invalidateSession(
            req.sessionID,
        );

        req.logout(() => {
            req.session.destroy(() => {
                res.clearCookie('connect.sid');

                res.send({
                    message: 'Logged out',
                });
            });
        });
    }
}