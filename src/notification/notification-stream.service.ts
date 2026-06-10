import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class NotificationStreamService {
  private clients = new Map<string, Set<Subject<MessageEvent>>>();

  subscribe(userId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }

    this.clients.get(userId)?.add(subject);

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
