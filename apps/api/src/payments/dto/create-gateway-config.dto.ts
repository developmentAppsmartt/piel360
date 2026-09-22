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

export class CreateGatewayConfigDto {
  @IsOptional()
  @IsString()
  gatewayName?: string;

  @IsIn(ENVIRONMENTS)
  environment!: (typeof ENVIRONMENTS)[number];

  @IsString()
  publicKey!: string;

  @IsOptional()
  @IsString()
  privateKey?: string;

  @IsOptional()
  @IsString()
  integritySecret?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  /** % comisión de la pasarela (default 2.99). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  feePercent?: number;

  /** Gasto operativo fijo en COP (default 0). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  operationalCostFixed?: number;

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
