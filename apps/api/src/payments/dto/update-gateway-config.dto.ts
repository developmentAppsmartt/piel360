import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

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
  @IsBoolean()
  isActive?: boolean;
}
