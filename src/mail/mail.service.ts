import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('SMTP_HOST'),
      port: Number(this.configService.getOrThrow<number>('SMTP_PORT')),
      secure: false,
      auth: {
        user: this.configService.getOrThrow<string>('SMTP_USER'),
        pass: this.configService.getOrThrow<string>('SMTP_PASSWORD'),
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
        from: this.configService.getOrThrow<string>('SMTP_FROM'),
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

  async sendAnotherPackageMail(email: string, name: string, subject: string) {
    console.log('here');
    console.log('name', name);

    const result = await this.mailerService
      .sendMail({
        to: email,
        subject,
        template: 'email',
        context: {
          name: name,
        },
      })
      .catch((err) => {
        console.log(err);
        console.log('Error sending mail', err);
        throw new Error(err.message);
      });

    console.log('result', result);
    return result;
  }
}
