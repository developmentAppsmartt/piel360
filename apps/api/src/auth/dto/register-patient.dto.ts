import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterPatientDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  /**
   * Ticket de `POST /auth/otp/verify` (purpose=register).
   * Opcional mientras el OTP no esté integrado; si llega, se valida.
   */
  @IsOptional()
  @IsString()
  emailTicket?: string;
}
