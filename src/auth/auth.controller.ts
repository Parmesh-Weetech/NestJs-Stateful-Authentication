import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    ParseUUIDPipe,
    Post,
    Query,
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
    async login(
        @Req() req: Request,
        @Headers('X-Device-Id') deviceId?: string
    ): Promise<{
        message: string,
        user: Express.User | undefined
    }> {
        return await this.authService.login(req, deviceId || null)
    }

    @UseGuards(AuthenticatedGuard)
    @Get('me')
    me(@Req() req: Request) {
        return req.user;
    }

    @UseGuards(AuthenticatedGuard)
    @Get('sessions')
    async listSessions(
        @Req() req: Request,
        @Query('type') type: 'active' | 'in-active' | 'both' = 'active'
    ) {
        return await this.authService.listUserSessions(
            req,
            type
        )
    }

    @HttpCode(200)
    @Post('logout')
    async logout(
        @Req() req: Request,
        @Headers('X-Device-Id') deviceId: string
    ) {
        return await this.authService.logout(
            req,
            deviceId as string,
        );
    }
}