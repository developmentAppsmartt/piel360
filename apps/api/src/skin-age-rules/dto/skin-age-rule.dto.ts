import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

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

export class CreateSkinAgeRuleDto {
  @IsString()
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
}

export class UpdateSkinAgeRuleDto {
  @IsOptional()
  @IsString()
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
}

export class SimulateSkinAgeRuleDto {
  @IsString()
  birthDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  skinAgeYears!: number;
}
