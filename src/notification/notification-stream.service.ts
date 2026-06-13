import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { RedisService } from 'src/redis/redis.service';
import * as os from 'os';
import { randomUUID } from 'crypto';

@Injectable()
export class NotificationStreamService {
  private clients = new Map<string, Set<Subject<MessageEvent>>>();

  private refreshIntervals = new Map<string, NodeJS.Timeout>();

  public readonly serverId =
    process.env.SERVER_ID || os.hostname() || randomUUID();

  private readonly onlineTtlSeconds = 60 * 15;

  constructor(private readonly redisService: RedisService) {}

  subscribe(userId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }

    this.clients.get(userId)?.add(subject);

    const key = `sse:online:${userId}`;
    this.redisService
      .getClient()
      .set(key, this.serverId, { EX: this.onlineTtlSeconds })
      .catch(() => {
        console.log('error while setting redis key');
      });

    // Refresh TTL periodically
    if (!this.refreshIntervals.has(userId)) {
      const interval = setInterval(
        () => {
          this.redisService
            .getClient()
            .expire(key, this.onlineTtlSeconds)
            .catch(() => {});
        },
        (this.onlineTtlSeconds / 2) * 1000,
      );
      this.refreshIntervals.set(userId, interval);
    }

    const originalUnsubscribe = subject.unsubscribe.bind(subject);
    subject.unsubscribe = () => {
      try {
        const remaining = this.clients.get(userId)?.size ?? 0;
        if (remaining <= 1) {
          // Will be 0 after this unsubscribe
          this.redisService
            .getClient()
            .del(key)
            .catch(() => {
              console.log('error while deleting redis key');
            });
          const interval = this.refreshIntervals.get(userId);
          if (interval) {
            clearInterval(interval);
            this.refreshIntervals.delete(userId);
          }
        }
      } catch {
        console.log('error while deleting redis key');
      }

      return originalUnsubscribe();
    };

    return subject.asObservable();
  }

  isOnline(userId: string): boolean {
    return (this.clients.get(userId)?.size ?? 0) > 0;
  }

  unsubscribe(userId: string, subject: Subject<MessageEvent>) {
    const connections = this.clients.get(userId);

    if (!connections) {
      return;
    }

    connections.delete(subject);

    if (connections.size === 0) {
      this.clients.delete(userId);
    }

    console.log('disconnected');
  }

  sendToUser(
    userId: string,
    payload: {
      id: string;
      title: string;
      message: string;
      createdAt: Date;
    },
  ) {
    const connections = this.clients.get(userId);

    if (!connections) {
      return;
    }

    for (const connection of connections) {
      connection.next({
        data: payload,
      });

      console.log('Sse send to ', userId);
    }
  }
}
