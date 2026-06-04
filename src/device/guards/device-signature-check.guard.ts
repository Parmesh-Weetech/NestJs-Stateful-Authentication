import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { DeviceService } from "src/device/device.service";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "src/common/decorators/public.decorator";

@Injectable()
export class DeviceSignatureCheckGuard implements CanActivate {

    constructor(
        private readonly deviceService: DeviceService,
        private readonly reflector: Reflector
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();

        const deviceId = request.headers['x-device-id'];
        const userAgent = request.headers['user-agent'];
        const signature = request.headers['x-device-signature'];
        const sessionId = request.sessionID;

        if (!deviceId || !userAgent || !signature || !sessionId) {
            throw new UnauthorizedException('Missing device credentials');
        }

        const result = await this.deviceService.verifySignature(
            deviceId,
            request.sessionID,
            signature,
        );

        if (!result) {
            throw new UnauthorizedException('Invalid device credentials');
        }

        const fingerprint =
            this.deviceService.generateFingerprint(
                deviceId,
                userAgent,
            );

        request.deviceFingerprint =
            fingerprint;

        request.deviceId = deviceId;

        return true;
    }
}