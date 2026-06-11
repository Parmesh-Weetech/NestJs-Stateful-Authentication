import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class SendEmailDTO {
  @IsEmail({}, { message: 'Invalid email address' })
  to: string;

  @IsNotEmpty({ message: 'Subject is required' })
  subject: string;

  @IsNotEmpty({ message: 'Template name is required' })
  templateName: string;

  @IsOptional()
  data: Record<string, any>;
}
