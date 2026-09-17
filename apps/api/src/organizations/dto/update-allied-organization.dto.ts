import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateAlliedOrganizationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  referralCommissionPercent?: number;

  /** Si true, genera un nuevo código de referido. */
  @IsOptional()
  @IsBoolean()
  regenerateCode?: boolean;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankId?: string;

  @IsOptional()
  @IsString()
  bankAccountType?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  payoutBeneficiaryName?: string;

  @IsOptional()
  @IsString()
  payoutBeneficiaryEmail?: string;

  @IsOptional()
  @IsString()
  payoutLegalIdType?: string;

  @IsOptional()
  @IsString()
  payoutLegalId?: string;

  @IsOptional()
  @IsString()
  legalRepDocType?: string;

  @IsOptional()
  @IsString()
  legalRepDocNumber?: string;
}
