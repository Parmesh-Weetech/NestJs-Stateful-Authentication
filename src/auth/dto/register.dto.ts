import { Exclude } from 'class-transformer';
import {
    IsEmail,
    MaxLength,
    MinLength,
} from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @MinLength(8)
    @MaxLength(16)
    @Exclude()
    password: string;
}