import {
  IsEmail,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import {
  LEAD_INTENT_VALUES,
  LEAD_INTEREST_VALUES,
  type LeadIntent,
  type LeadInterest,
} from '@piel360/shared';

export class CreateLeadDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsString()
  @Length(2, 160)
  business!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @Length(7, 30)
  phone!: string;

  @IsIn(LEAD_INTEREST_VALUES)
  interest!: LeadInterest;

  @IsIn(LEAD_INTENT_VALUES)
  intent!: LeadIntent;

  @IsOptional()
  @IsNumberString()
  planId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmCampaign?: string;

  /** Trampa para bots: el campo va oculto en el formulario, una persona lo
   * deja vacío. Si llega con algo se responde como si se hubiera guardado. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
