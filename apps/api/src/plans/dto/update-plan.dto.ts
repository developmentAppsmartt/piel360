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
import { PlanApiCostsDto, PlanCoverageDto, PlanFeatureDto } from './create-plan.dto';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumberString()
  analysisProviderId?: string;

  @IsOptional()
  @IsArray()
  @IsNumberString({}, { each: true })
  analysisProviderIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  analysisLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxUsers?: number;

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
  @ValidateNested()
  @Type(() => PlanCoverageDto)
  coverage?: PlanCoverageDto;

  @IsOptional()
  @IsString()
  headerColor?: string;

  @IsOptional()
  @IsString()
  planType?: 'individual' | 'business';

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanApiCostsDto)
  apiCosts?: PlanApiCostsDto;

  @IsOptional()
  @IsBoolean()
  ivaEnabled?: boolean;
}
