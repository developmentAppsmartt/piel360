import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
