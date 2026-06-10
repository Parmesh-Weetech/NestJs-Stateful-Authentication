import { Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { RedisService } from './redis.service';

@Injectable()
export class RedisPublisher {
  private client: RedisClientType;

  constructor(private readonly redisService: RedisService) {
    this.client = this.redisService.getClient();
  }

  async publish(channel: string, message: string) {
    await this.client.publish(channel, message);
  }
}
