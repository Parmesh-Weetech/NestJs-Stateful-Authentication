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
    async login(@Req() req: Request) {
        await this.sessionService.createSession({
            userId: (req.user as any)?.id,
            sessionId: req.sessionID,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            expiresAt: new Date(
                Date.now() + 1000 * 60 * 60 * 24,
            ),
            lastActivityAt: new Date(),
        });

        return {
            message: 'Logged in',
            user: req.user,
        };
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