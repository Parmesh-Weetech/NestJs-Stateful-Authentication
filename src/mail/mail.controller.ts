import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { SendEmailDTO } from './dtos/send-email.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  async sendMail(@Body() body: SendEmailDTO) {
    return await this.mailService.sendMail(body);
  }

  @Post('send/v2')
  async sendMailV2(
    @Body() body: { email: string; name: string; subject: string },
  ) {
    return await this.mailService.sendAnotherPackageMail(
      body.email,
      body.name,
      body.subject,
    );
  }
}
