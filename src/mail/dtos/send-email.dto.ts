import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendEmailDTO {
  @IsEmail({}, { message: 'Invalid email address' })
  to: string;

  @IsNotEmpty({ message: 'Subject is required' })
  @MaxLength(100, { message: 'Subject must be at most 100 characters' })
  @MinLength(10, { message: 'Subject must be at least 10 characters' })
  subject: string;

  @IsNotEmpty({ message: 'Template name is required' })
  @MaxLength(50, { message: 'Template name must be at most 50 characters' })
  @MinLength(5, { message: 'Template name must be at least 5 characters' })
  templateName: string;

  @IsObject({ message: 'Data must be an object' })
  @IsOptional()
  data: Record<string, any>;
}
