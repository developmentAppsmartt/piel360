import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAnalysisDto {
  @IsNumberString()
  patientId!: string;

  @IsOptional()
  @IsString()
  bodyRegion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  xCoord?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yCoord?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  zCoord?: number;

  /** Notas de este análisis. No se copian al paciente ni al siguiente. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  doctorNotes?: string;

  /** "true" si se aceptó el consentimiento previo al análisis. Opcional: la
   * app instalada antes del cambio no lo manda. Llega por multipart (texto). */
  @IsOptional()
  @IsIn(['true'])
  consentAccepted?: 'true';
}
