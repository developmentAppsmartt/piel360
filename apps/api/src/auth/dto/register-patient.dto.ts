import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

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
   * Opcional mientras el OTP de email no esté integrado; si llega, se valida.
   */
  @IsOptional()
  @IsString()
  emailTicket?: string;

  @Matches(/^\d{10,15}$/, {
    message:
      'Teléfono inválido — usa solo dígitos, con indicativo de país (10 a 15 dígitos)',
  })
  phone!: string;

  /** Ticket de `POST /auth/otp/phone/verify` — obligatorio, el registro no
   * se completa sin haber verificado el teléfono. */
  @IsString()
  phoneTicket!: string;
}
