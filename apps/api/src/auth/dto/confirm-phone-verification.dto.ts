import { IsString, Matches } from 'class-validator';

export class ConfirmPhoneVerificationDto {
  @Matches(/^\d{10,15}$/, {
    message:
      'Teléfono inválido — usa solo dígitos, con indicativo de país (10 a 15 dígitos)',
  })
  phone!: string;

  @IsString()
  phoneTicket!: string;
}
