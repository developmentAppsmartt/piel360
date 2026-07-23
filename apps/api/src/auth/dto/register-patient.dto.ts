import { IsEmail, IsString, MinLength } from 'class-validator';

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

  /** Ticket emitido por `POST /auth/otp/verify` (purpose=register). Obligatorio. */
  @IsString()
  emailTicket!: string;
}
