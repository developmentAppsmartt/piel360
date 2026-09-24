import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const ENVIRONMENTS = ['sandbox', 'production'] as const;

export class UpdateGatewayConfigDto {
  @IsOptional()
  @IsString()
  gatewayName?: string;

  @IsOptional()
  @IsIn(ENVIRONMENTS)
  environment?: (typeof ENVIRONMENTS)[number];

  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsString()
  privateKey?: string;

  @IsOptional()
  @IsString()
  integritySecret?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  feePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  operationalCostFixed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  operationalCostPercent?: number;

  @IsOptional()
  @IsString()
  payoutApiKey?: string;

  @IsOptional()
  @IsString()
  payoutUserPrincipalId?: string;

  @IsOptional()
  @IsString()
  payoutAccountId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
