import { PUBLIC_ANALYSIS_PROVIDER_SLUGS } from '@piel360/shared';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSpecialtyPlanPermissionsDto {
  @IsString()
  roleId!: string;

  @IsOptional()
  @IsBoolean()
  analisisdermapiel360?: boolean;

  @IsOptional()
  @IsBoolean()
  analisispiel360?: boolean;

  @IsOptional()
  @IsBoolean()
  fitzpatrick?: boolean;
}

// Referencia estática para validación futura por slug dinámico.
void PUBLIC_ANALYSIS_PROVIDER_SLUGS;
