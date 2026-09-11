import { IsIn, IsOptional, Matches } from 'class-validator';

export class SendPhoneOtpDto {
  /** Solo dígitos, con indicativo de país incluido (ej. "573001234567") — sin "+". */
  @Matches(/^\d{10,15}$/, {
    message:
      'Teléfono inválido — usa solo dígitos, con indicativo de país (10 a 15 dígitos)',
  })
  phone!: string;

  /**
   * `register` (default): el teléfono no debe existir.
   * `reset`: recuperación de contraseña; si no existe, responde OK igual.
   */
  @IsOptional()
  @IsIn(['register', 'reset'])
  purpose?: 'register' | 'reset';
}
