import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PlanFeatureDto {
  @IsString()
  label!: string;

  @IsBoolean()
  included!: boolean;
}

export class CreatePlanDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsNumberString()
  analysisProviderId?: string;

  @IsOptional()
  @IsArray()
  @IsNumberString({}, { each: true })
  analysisProviderIds?: string[];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  analysisLimit!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  durationDays!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxUsers!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @IsOptional()
  @IsObject()
  roleLimits?: Record<string, number>;

  /** { skiniver?: number, aesthetic?: number } */
  @IsOptional()
  @IsObject()
  analysisLimits?: { skiniver?: number; aesthetic?: number };

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureDto)
  features?: PlanFeatureDto[];

  @IsOptional()
  @IsString()
  headerColor?: string;

  @IsOptional()
  @IsString()
  planType?: 'individual' | 'business';
}
