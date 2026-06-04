import { Injectable } from "@nestjs/common";
import { DeviceType } from "src/auth/types/device.type";
import { GeoService } from "src/geo/geo.service";
import { UAParser } from "ua-parser-js";

@Injectable()
export class DeviceMetadataService {
    constructor(
        private readonly geoService: GeoService
    ) { }

    async extract(
        ip: string,
        userAgent: string
    ) {
        // UAParser
        const usInfo = this.getUAInformation(userAgent);

        // Maxmind
        const geoInfo = await this.geoService.getFullGeo(ip);

        // build device metadata
        return {
            userAgentInfo: usInfo,
            geoLocationInfo: geoInfo
        }
    }

    getUAInformation(userAgent: string) {
        const parser = new UAParser(userAgent);

        const result = parser.getResult();

        const browser =
            result.browser.name ??
            (userAgent.includes('PostmanRuntime')
                ? 'Postman'
                : 'Unknown browser');

        const browserVersion = result.browser.version ?? (
            userAgent.includes('PostmanRuntime')
                ? userAgent.split('/')[1]
                : 'Unknown version'
        );

        const os = result.os.name ?? 'Unknown OS';
        const osVersion = result.os.version ?? 'Unknown version';

        const deviceType = this.mapDeviceType(
            result.device.type,
        );

        const deviceName = this.buildDeviceName(
            browser,
            os,
        );

        return {
            userAgent,

            browser,
            browserVersion,

            os,
            osVersion,

            deviceType,
            deviceName,
        };
    }

    private mapDeviceType(
        deviceType?: string,
    ): DeviceType {
        switch (deviceType) {
            case 'mobile':
                return DeviceType.MOBILE;

            case 'tablet':
                return DeviceType.TABLET;

            case 'smarttv':
                return DeviceType.SMART_TV;

            case 'console':
                return DeviceType.CONSOLE;

            case 'wearable':
                return DeviceType.WEARABLE;

            case 'embedded':
                return DeviceType.EMBEDDED;

            case 'bot':
                return DeviceType.BOT;

            default:
                return DeviceType.DESKTOP;
        }
    }

    private buildDeviceName(
        browser: string | null,
        os: string | null,
    ): string {
        if (browser && os) {
            return `${browser} on ${os}`;
        }

        if (browser) {
            return browser;
        }

        if (os) {
            return os;
        }

        return 'Unknown Device';
    }
}