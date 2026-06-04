import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class DeviceService {
    private readonly secret = process.env.FINGERPRINT_SECRET!;

    generateSignature(
        deviceId: string,
        sessionId: string,
    ): string {
        return createHmac('sha256', this.secret)
            .update(`${deviceId}:${sessionId}`)
            .digest('hex');
    }

    verifySignature(
        deviceId: string,
        sessionId: string,
        signature: string,
    ): boolean {
        const expectedSignature =
            this.generateSignature(deviceId, sessionId);

        return timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature),
        );
    }

    generateFingerprint(
        deviceId: string,
        userAgent: string,
    ): string {
        return createHmac('sha256', this.secret)
            .update(
                `${deviceId}:${userAgent}`,
            )
            .digest('hex');
    }
}
