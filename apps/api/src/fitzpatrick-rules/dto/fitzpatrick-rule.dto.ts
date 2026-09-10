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
import { FITZPATRICK_SCALES } from '@piel360/shared';

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
}

export class SimulateFitzpatrickRuleDto {
  @IsIn([...FITZPATRICK_SCALES])
  fitzpatrickScale!: string;
}
