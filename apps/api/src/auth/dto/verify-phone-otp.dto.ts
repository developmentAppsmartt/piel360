import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class VerifyPhoneOtpDto {
  @Matches(/^\d{10,15}$/, {
    message:
      'Teléfono inválido — usa solo dígitos, con indicativo de país (10 a 15 dígitos)',
  })
  phone!: string;

  @IsString()
  code!: string;

  /**
   * `register` (default) → `{ ticket }`.
   * `reset` → `{ token }` para `reset-password`.
   */
  @IsOptional()
  @IsIn(['register', 'reset'])
  purpose?: 'register' | 'reset';
}
