import { MailerService } from '@nestjs-modules/mailer';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Queue } from 'bullmq';
import { SendEmailDTO } from './dtos/send-email.dto';
import { SendEmailType } from './types/mail.type';
import { createHash } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Mail } from './entities/mail.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectQueue('EMAIL_QUEUE')
    private readonly emailQueue: Queue,

    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,

    @InjectRepository(Mail)
    private readonly mailRepository: Repository<Mail>,
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
    // check whether templateName template exists or not
    const templatePath = `${process.cwd()}/public/assets/templates/${body.templateName}.ejs`;

    if (!fs.existsSync(templatePath)) {
      throw new Error('Template not found');
    }

    const jobId = createHash('sha256')
      .update(`${body.to}:${body.subject}:${body.templateName}`)
      .digest('hex');

    // Producer-side idempotency: if a log already exists as SENT/PROCESSING for this jobId,
    // do not enqueue another job.
    const existing = await this.mailRepository.findOne({ where: { jobId } });
    if (existing?.status === SendEmailType.SENT) {
      return {
        jobId,
        status: SendEmailType.SENT,
        message: 'Email already send! Check Inbox',
      };
    }

    if (existing?.status === SendEmailType.PROCESSING) {
      return {
        jobId,
        status: SendEmailType.PROCESSING,
        message: 'Email already processing!',
      };
    }

    const mailLog = await this.mailRepository.save(
      this.mailRepository.create({
        jobId,
        recipient: body.to,
        subject: body.subject,
        status: SendEmailType.PENDING,
        templateName: body.templateName,
        data: body.data,
      }),
    );

    const mailJob = await this.emailQueue.add(
      'EMAIL_JOB',
      {
        jobId,
        id: mailLog.id,
        to: body.to,
        subject: body.subject,
        templateName: body.templateName,
        data: body.data,
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
        // Poison-job safety: when job ultimately fails (after attempts), BullMQ retains it for inspection.
        // DB will be marked FAILED/DLQ by the processor on final attempt.
        // Keep enough evidence in DB; retry will re-run on thrown errors.
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
