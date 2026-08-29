import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  /** Solo lo manda móvil (sin cookies) — web lo trae en la cookie `piel360_refresh`. */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
