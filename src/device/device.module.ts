import { Global, Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceMetadataService } from './device-metadata.service';
import { GeoModule } from 'src/geo/geo.module';

@Global()
@Module({
  providers: [DeviceService, DeviceMetadataService],
  exports: [DeviceService, DeviceMetadataService],
  imports: [GeoModule]
})
export class DeviceModule { }
