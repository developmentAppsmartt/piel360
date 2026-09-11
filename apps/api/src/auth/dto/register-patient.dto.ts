import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
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

  /** ISO `YYYY-MM-DD`. */
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsString()
  skinType?: string;

  @IsOptional()
  @IsString()
  fitzpatrickType?: string;

  @IsOptional()
  @IsString()
  mascotType?: string;
}
