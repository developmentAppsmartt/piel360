import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDoctorDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

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
