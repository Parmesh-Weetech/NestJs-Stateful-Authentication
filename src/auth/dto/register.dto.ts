import { Exclude, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserPlan } from 'src/user/types/plan.type';

export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  @MaxLength(16)
  password: string;

  @IsOptional()
  @IsEnum(UserPlan)
  plan: UserPlan;

  @IsOptional()
  @IsNotEmpty()
  @Type(() => String)
  otp: string;
}
