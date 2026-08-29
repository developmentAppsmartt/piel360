import { ANALYSIS_PROVIDER_SLUGS } from '@piel360/shared';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSpecialtyPlanPermissionsDto {
  @IsString()
  roleId!: string;

  @IsOptional()
  @IsBoolean()
  skiniver?: boolean;

  @IsOptional()
  @IsBoolean()
  youcam?: boolean;

  @IsOptional()
  @IsBoolean()
  fitzpatrick?: boolean;
}

// Referencia estática para validación futura por slug dinámico.
void ANALYSIS_PROVIDER_SLUGS;
