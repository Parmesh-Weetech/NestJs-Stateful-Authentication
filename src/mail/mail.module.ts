import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EjsAdapter } from '@nestjs-modules/mailer/adapters/ejs.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mail } from './entities/mail.entity';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './processor/email.processor';

@Module({
  providers: [MailService, EmailProcessor],
  controllers: [MailController],
  imports: [
    TypeOrmModule.forFeature([Mail]),
    BullModule.registerQueue({
      name: 'EMAIL_QUEUE',
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.getOrThrow<string>('SMTP_HOST'),
          port: Number(configService.getOrThrow<string>('SMTP_PORT')),
          from: configService.getOrThrow<string>('SMTP_FROM'),
          secure: false,
          auth: {
            user: configService.getOrThrow<string>('SMTP_USER'),
            pass: configService.getOrThrow<string>('SMTP_PASSWORD'),
          },
        },
        defaults: {
          from: `"noreply" ${configService.getOrThrow<string>('SMTP_FROM')}`,
        },
        template: {
          dir: join(process.cwd(), 'public/assets/templates'),
          adapter: new EjsAdapter(),
          options: {
            strict: false,
          },
        },
      }),
    }),
  ],
})
export class MailModule {}
