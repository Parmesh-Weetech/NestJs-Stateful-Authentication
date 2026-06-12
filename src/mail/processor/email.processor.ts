import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleDestroy } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import * as ejs from 'ejs';
import { InjectRepository } from '@nestjs/typeorm';
import { Mail } from '../entities/mail.entity';
import { Repository } from 'typeorm';
import { SendEmailType } from '../types/mail.type';
import { InjectQueue } from '@nestjs/bullmq';

// Keep these aligned with @Processor('EMAIL_JOB', { lockDuration, stalledInterval })
const EMAIL_LOCK_DURATION_MS = 60000;
const EMAIL_STALE_PROCESSING_MS = Math.floor(EMAIL_LOCK_DURATION_MS / 2);

@Processor('EMAIL_QUEUE', {
  limiter: {
    max: 5,
    duration: 1000,
  },
  concurrency: 5,

  // BullMQ lock/stalled settings ("visibility timeout" equivalent)
  // - lockDuration: how long the job is kept "in progress" before it can be reclaimed
  // - stalledInterval: how often BullMQ checks for stalled workers
  //
  // Keep these > worst-case send time (SMTP timeouts are 10s in nodemailer config);
  // also allow retry/crash recovery.
  lockDuration: 60000,
  stalledInterval: 30000,
})
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(Mail)
    private readonly mailRepository: Repository<Mail>,

    @InjectQueue('EMAIL_DLQ_JOB')
    private readonly emailDlqQueue: Queue,
  ) {
    super();

    // Start async init, but keep a Promise so process() can await it safely.
    this.transporterInitPromise = this.initializeTransporter();
  }

  private transporter!: nodemailer.Transporter;
  private transporterInitPromise?: Promise<void>;

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

  async process(
    job: Job<{
      id: number;

      jobId: string;
      to: string;
      subject: string;
      templateName: string;
      data: Record<string, any>;
    }>,
  ) {
    console.log('pick up', job.id);

    // Ensure SMTP transporter is ready (race-proof)
    await this.transporterInitPromise;

    const { id, jobId, to, subject, templateName, data } = job.data;

    const existing = await this.mailRepository.findOne({ where: { id } });

    // Producer should have created the DB row before enqueue.
    // If it doesn't exist, treat as data integrity issue and fail the job.
    if (!existing) {
      throw new Error(`Mail log not found (id=${id}, jobId=${jobId})`);
    }

    // Idempotency:
    // - If SENT: never send again.
    // - If PROCESSING: skip only when it's likely still in-flight.
    //   If PROCESSING is stale (worker crash), allow re-send.
    if (existing?.status === SendEmailType.SENT) {
      return;
    }

    if (existing?.status === SendEmailType.PROCESSING) {
      const startedAtMs = existing.processingStartAt?.getTime?.();
      const nowMs = Date.now();

      // Treat PROCESSING as in-flight for ~half the BullMQ lockDuration.
      const staleMs = EMAIL_STALE_PROCESSING_MS;

      if (startedAtMs && nowMs - startedAtMs < staleMs) {
        return;
      }
    }

    // Mark as processing. BullMQ will handle reclaim/retry after lockDuration/stalled detection.
    // Use idempotent UPDATE and refresh processingStartAt so stale detection works.
    const affectedRows = await this.mailRepository.update(id, {
      status: SendEmailType.PROCESSING,
      processingStartAt: new Date(),
    });

    if (
      !affectedRows ||
      affectedRows.affected === undefined ||
      affectedRows.affected <= 0
    ) {
      throw new Error(`Mail log not found or not updated (id=${id})`);
    }

    try {
      // Resolve from process.cwd() to work in compiled/Docker environments.
      const templatePath = `${process.cwd()}/public/assets/templates/${templateName}.ejs`;

      const template = readFileSync(templatePath, 'utf-8');

      const html = ejs.render(template, data);

      console.log(`Sending email to ${to}`, subject);

      await this.transporter.sendMail({
        from: this.configService.getOrThrow<string>('SMTP_FROM'),
        to,
        subject,
        html,
      });

      const updated = await this.mailRepository.update(id, {
        status: SendEmailType.SENT,
        sentAt: new Date(),
      });

      if (!updated || updated.affected === undefined || updated.affected <= 0) {
        // Job succeeded (SMTP accepted) but DB update failed; fail the job to be consistent.
        throw new Error(`Mail log update failed (id=${id})`);
      }
    } catch (error: any) {
      console.log('Error while sending email', error);

      // BullMQ increments attemptsMade after each failure.
      const attemptsMade = job?.attemptsMade ?? 0;
      const maxAttempts = (job?.opts?.attempts ?? 3) as number;
      const isLastAttempt = attemptsMade >= maxAttempts - 1;

      const failureReason = error?.message || String(error);

      // If this is the last attempt, route to real BullMQ DLQ queue.
      if (isLastAttempt) {
        await this.mailRepository.update(id, {
          status: SendEmailType.DLQ,
          failureReason,
        });

        // Push the DLQ payload so poison jobs are visible/handled in BullMQ.
        // If DLQ enqueue fails, rethrow so the original job failure is not hidden.
        try {
          await this.emailDlqQueue.add(
            'EMAIL_DLQ_JOB',
            { id, failureReason },
            {
              removeOnComplete: true,
              removeOnFail: true,
            },
          );
        } catch (dlqError: any) {
          console.log('Failed to enqueue DLQ job', dlqError);
          throw dlqError;
        }

        // Do NOT rethrow; job is handled via DLQ.
        return;
      }

      // Non-final failure: mark failed and rethrow to trigger BullMQ retry/backoff.
      await this.mailRepository.update(id, {
        status: SendEmailType.FAILED,
        failureReason,
      });

      throw error;
    }
  }
}
