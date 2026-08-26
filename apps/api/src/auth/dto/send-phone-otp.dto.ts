import { Matches } from 'class-validator';

export class SendPhoneOtpDto {
  /** Solo dígitos, con indicativo de país incluido (ej. "573001234567") — sin "+". */
  @Matches(/^\d{10,15}$/, {
    message:
      'Teléfono inválido — usa solo dígitos, con indicativo de país (10 a 15 dígitos)',
  })
  phone!: string;
}
