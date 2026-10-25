import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ANALISIS_PIEL360_SKIN_TYPE_VALUES,
  FITZPATRICK_SCALES,
} from '@piel360/shared';

export const SKIN_AGE_RULE_PRIORITIES = [
  'low',
  'medium',
  'high',
  'very_high',
] as const;

export const SKIN_AGE_RULE_COLOR_KEYS = [
  'green',
  'blue',
  'orange',
  'amber',
  'red',
] as const;

const NOMBRE = { message: 'Escribe el nombre de la regla' };
const BIOTIPO = { each: true, message: 'Biotipo no válido' };
const FOTOTIPO = { each: true, message: 'Fototipo no válido' };

export class CreateSkinAgeRuleDto {
  @IsString()
  @IsNotEmpty(NOMBRE)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  minDifference!: number;

  @Type(() => Number)
  @IsInt()
  maxDifference!: number;

  @IsOptional()
  @IsIn([...SKIN_AGE_RULE_PRIORITIES])
  priority?: string;

  @IsOptional()
  @IsIn([...SKIN_AGE_RULE_COLOR_KEYS])
  colorKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  routineIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  treatmentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productGroupIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supplementGroupIds?: string[];

  /** Biotipos a los que aplica; vacío = todos. */
  @IsOptional()
  @IsArray()
  @IsIn([...ANALISIS_PIEL360_SKIN_TYPE_VALUES], BIOTIPO)
  skinTypes?: string[];

  /** Fototipos a los que aplica; vacío = todos. */
  @IsOptional()
  @IsArray()
  @IsIn([...FITZPATRICK_SCALES], FOTOTIPO)
  fitzpatrickScales?: string[];
}

export class UpdateSkinAgeRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty(NOMBRE)
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minDifference?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxDifference?: number;

  @IsOptional()
  @IsIn([...SKIN_AGE_RULE_PRIORITIES])
  priority?: string;

  @IsOptional()
  @IsIn([...SKIN_AGE_RULE_COLOR_KEYS])
  colorKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  routineIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  treatmentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productGroupIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supplementGroupIds?: string[];

  /** Biotipos a los que aplica; vacío = todos. */
  @IsOptional()
  @IsArray()
  @IsIn([...ANALISIS_PIEL360_SKIN_TYPE_VALUES], BIOTIPO)
  skinTypes?: string[];

  /** Fototipos a los que aplica; vacío = todos. */
  @IsOptional()
  @IsArray()
  @IsIn([...FITZPATRICK_SCALES], FOTOTIPO)
  fitzpatrickScales?: string[];
}

export class SimulateSkinAgeRuleDto {
  @IsString()
  birthDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  skinAgeYears!: number;

  @IsOptional()
  @IsIn([...ANALISIS_PIEL360_SKIN_TYPE_VALUES], {
    message: 'Biotipo no válido',
  })
  skinType?: string;

  @IsOptional()
  @IsIn([...FITZPATRICK_SCALES], { message: 'Fototipo no válido' })
  fitzpatrickScale?: string;
}
