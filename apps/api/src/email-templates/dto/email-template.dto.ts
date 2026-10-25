import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const DAYS_BEFORE_MESSAGE =
  'Los días de anticipación deben ser un número entero entre 1 y 30';

export class CreateEmailTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  kind?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  preheader?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  /** Solo en el recordatorio de cita: días antes de la cita en que sale. */
  @IsOptional()
  @IsInt({ message: DAYS_BEFORE_MESSAGE })
  @Min(1, { message: DAYS_BEFORE_MESSAGE })
  @Max(30, { message: DAYS_BEFORE_MESSAGE })
  @Type(() => Number)
  daysBefore?: number;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  preheader?: string | null;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  /** Solo en el recordatorio de cita: días antes de la cita en que sale. */
  @IsOptional()
  @IsInt({ message: DAYS_BEFORE_MESSAGE })
  @Min(1, { message: DAYS_BEFORE_MESSAGE })
  @Max(30, { message: DAYS_BEFORE_MESSAGE })
  @Type(() => Number)
  daysBefore?: number;
}

export class CreateEmailTemplateVariableDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  key!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sampleValue?: string;
}

export class UpdateEmailTemplateVariableDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  key?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sampleValue?: string | null;
}
