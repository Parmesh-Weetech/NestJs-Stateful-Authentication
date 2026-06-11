import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SendEmailDTO } from '../dtos/send-email.dto';
import { createRedisClient } from 'src/redis/helper/createRedisClient';
import nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import * as ejs from 'ejs';
import { InjectRepository } from '@nestjs/typeorm';
import { Mail } from '../entities/mail.entity';
import { Repository } from 'typeorm';
import { SendEmailType } from '../types/mail.type';

@Processor('EMAIL_JOB', {
  limiter: {
    max: 5,
    duration: 1000,
  },
  concurrency: 5,
})
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(Mail)
    private readonly mailRepository: Repository<Mail>,
  ) {
    super();
    this.initializeTransporter();
  }

  private transporter: nodemailer.Transporter;

  private async initializeTransporter() {
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

  async process(job: Job<SendEmailDTO>) {
    const { to, subject, templateName, data } = job.data;

    const existing = await this.mailRepository.findOne({
      where: { id: job.id },
    });

    if (!existing) {
      console.log('no existing');

      await this.mailRepository.save(
        this.mailRepository.create({
          to,
          subject,
          id: job.id,
          status: SendEmailType.PENDING,
        }),
      );
    }

    if (existing && existing.status === SendEmailType.COMPLETED) {
      return;
    }

    const lockKey = `lock:email:${job.id}`;

    // 1. Distributed lock
    const redis = createRedisClient();
    await redis.connect();
    const lockAcquired = await redis.set(lockKey, 'locked', {
      NX: true,
      PX: 30000,
    });

    if (!lockAcquired) return;

    try {
      const template = readFileSync(
        `../../../public/assets/templates/${templateName}.ejs`,
        'utf-8',
      );

      const html = ejs.render(template, data);

      console.log(`Sending email to ${to}`, subject);

      await this.transporter
        .sendMail({
          from: this.configService.getOrThrow<string>('SMTP_FROM'),
          to,
          subject,
          html,
        })
        .then((res) => {
          console.log(res);
          console.log('Mail send successfully');
          return 'Mail send successfully';
        })
        .catch((err) => {
          console.log('Mail send failed', err);
          return err.message;
        });
    } catch (error) {
      console.log('Error while sending email', error);
    } finally {
      if (redis.isOpen) {
        await redis.quit();
      }
    }
  }
}
