import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  /** Token de reCAPTCHA v2 (login móvil). */
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
