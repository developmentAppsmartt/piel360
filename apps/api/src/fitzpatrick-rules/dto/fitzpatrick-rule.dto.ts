import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  ANALISIS_PIEL360_SKIN_TYPE_VALUES,
  FITZPATRICK_SCALES,
} from '@piel360/shared';

const BIOTIPO = { each: true, message: 'Biotipo no válido' };

export const FITZPATRICK_RULE_PRIORITIES = [
  'low',
  'medium',
  'high',
  'very_high',
] as const;

export const FITZPATRICK_RULE_COLOR_KEYS = [
  'green',
  'blue',
  'orange',
  'amber',
  'red',
] as const;

export class CreateFitzpatrickRuleDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn([...FITZPATRICK_SCALES])
  fitzpatrickScale!: string;

  @IsOptional()
  @IsIn([...FITZPATRICK_RULE_PRIORITIES])
  priority?: string;

  @IsOptional()
  @IsIn([...FITZPATRICK_RULE_COLOR_KEYS])
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
}

export class UpdateFitzpatrickRuleDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn([...FITZPATRICK_SCALES])
  fitzpatrickScale?: string;

  @IsOptional()
  @IsIn([...FITZPATRICK_RULE_PRIORITIES])
  priority?: string;

  @IsOptional()
  @IsIn([...FITZPATRICK_RULE_COLOR_KEYS])
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
}

export class SimulateFitzpatrickRuleDto {
  @IsIn([...FITZPATRICK_SCALES])
  fitzpatrickScale!: string;

  /** Sin biotipo = paciente al que no se le conoce. */
  @IsOptional()
  @IsIn([...ANALISIS_PIEL360_SKIN_TYPE_VALUES], {
    message: 'Biotipo no válido',
  })
  skinType?: string;
}
