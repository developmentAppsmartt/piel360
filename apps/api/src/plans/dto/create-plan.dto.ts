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

export class PlanCoverageItemDto {
  @IsString()
  key!: string;

  @IsString()
  label!: string;

  @IsString()
  description!: string;
}

export class PlanCoverageDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanCoverageItemDto)
  aesthetic?: PlanCoverageItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanCoverageItemDto)
  dermatologyClasses?: PlanCoverageItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanCoverageItemDto)
  dermatologyDiseases?: PlanCoverageItemDto[];

  @IsOptional()
  @IsString()
  aestheticHtml?: string;

  @IsOptional()
  @IsString()
  dermatologyClassesHtml?: string;

  @IsOptional()
  @IsString()
  dermatologyDiseasesHtml?: string;
}

export class PlanApiCostLineDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  units!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class PlanApiCostsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanApiCostLineDto)
  skiniver?: PlanApiCostLineDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanApiCostLineDto)
  youcam?: PlanApiCostLineDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanApiCostLineDto)
  fitzpatrick?: PlanApiCostLineDto;
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
