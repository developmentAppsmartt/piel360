import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

/** Canal OTP para cambiar contraseña estando autenticado. */
export class SendChangePasswordOtpDto {
  @IsIn(['email', 'phone'])
  channel!: 'email' | 'phone';

  /**
   * Obligatorio si `channel=phone`. Dígitos con indicativo (ej. 573001234567).
   * Puede ser el celular actual o uno nuevo (se actualizará al confirmar).
   */
  @IsOptional()
  @Matches(/^\d{10,15}$/, {
    message:
      'Teléfono inválido — usa solo dígitos, con indicativo de país (10 a 15 dígitos)',
  })
  phone?: string;
}

export class VerifyChangePasswordOtpDto {
  @IsIn(['email', 'phone'])
  channel!: 'email' | 'phone';

  @IsString()
  code!: string;

  @IsOptional()
  @Matches(/^\d{10,15}$/, {
    message:
      'Teléfono inválido — usa solo dígitos, con indicativo de país (10 a 15 dígitos)',
  })
  phone?: string;
}
