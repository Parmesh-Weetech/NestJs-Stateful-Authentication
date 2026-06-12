import { Processor } from '@nestjs/bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mail } from '../entities/mail.entity';
import { SendEmailType } from '../types/mail.type';

@Processor('EMAIL_DLQ_JOB', {
  lockDuration: 60000,
  stalledInterval: 30000,
})
export class EmailDlqProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Mail)
    private readonly mailRepository: Repository<Mail>,
  ) {
    super();
  }

  async process(job: Job<{ id: number; failureReason: string }>) {
    const { id, failureReason } = job.data;

    // Mark as DLQ in DB.
    await this.mailRepository.update(id, {
      status: SendEmailType.DLQ,
      failureReason,
    });

    // No throw: DLQ processor should not retry.
    return;
  }
}
