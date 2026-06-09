import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  async sendMail(@Body() body: { to: string; subject: string; text: string }) {
    return await this.mailService.sendMail(body.to, body.subject, body.text);
  }

  @Post('send/v2')
  async sendMailV2(
    @Body() body: { email: string; name: string; subject: string },
  ) {
    console.log('here in controller');
    return await this.mailService.sendAnotherPackageMail(
      body.email,
      body.name,
      body.subject,
    );
  }
}
