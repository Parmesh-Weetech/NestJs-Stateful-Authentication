import { MailerService } from '@nestjs-modules/mailer';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Queue } from 'bullmq';
import { SendEmailDTO } from './dtos/send-email.dto';
import { SendEmailType } from './types/mail.type';

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectQueue('EMAIL_QUEUE')
    private readonly emailQueue: Queue,

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

  async sendMail(body: SendEmailDTO) {
    const mailJob = await this.emailQueue.add(
      process.env.EMAIL_JOB!,
      {
        to: body.to,
        subject: body.subject,
        templateName: body.templateName,
        data: body.data,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      jobId: mailJob.id,
      status: SendEmailType.QUEUED,
    };
  }

  async onModuleDestroy() {
    await this.transporter.close();
  }

  async sendAnotherPackageMail(email: string, name: string, subject: string) {
    const result = await this.mailerService
      .sendMail({
        to: email,
        subject,
        template: 'email',
        context: {
          name,
        },
      })
      .catch((err) => {
        console.log('Error sending mail', err);
        throw new Error(err.message);
      });

    return result;
  }
}
