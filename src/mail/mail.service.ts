import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<number>('SMTP_PORT')),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    await this.transporter
      .verify()
      .then(() => {
        console.log('SMTP connected');
      })
      .catch((err) => {
        console.log('Connection error: ', err);
      });
  }

  async sendMail(to: string, subject: string, text: string) {
    await this.transporter
      .sendMail({
        from: this.configService.get<string>('SMTP_FROM'),
        to,
        subject,
        text,
      })
      .then((res) => {
        console.log('Mail send successfully');
        return 'Mail send successfully';
      })
      .catch((err) => {
        console.log('Mail send failed', err);
        return err.message;
      });
  }

  async onModuleDestroy() {
    await this.transporter.close();
  }
}
