import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { DeviceService } from "src/device/device.service";

@Injectable()
export class DeviceSignatureCheckGuard implements CanActivate {

    constructor(
        private readonly deviceService: DeviceService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const endpoint = request.url;

        if (endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register')) {
            return true;
        }

        const deviceId = request.headers['x-device-id'];
        const userAgent = request.headers['user-agent'];
        const signature = request.headers['x-device-signature'];

        if (!deviceId || !userAgent || !signature) {
            throw new UnauthorizedException('Missing device credentials');
        }

        const result = await this.deviceService.verifySignature(
            deviceId,
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