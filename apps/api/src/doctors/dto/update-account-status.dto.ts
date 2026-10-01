import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAccountStatusDto {
  @IsBoolean()
  disabled!: boolean;

  /** Obligatorio al deshabilitar: se le muestra al usuario al iniciar sesión. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
