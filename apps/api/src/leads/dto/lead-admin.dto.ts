import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LEAD_STATUS_VALUES, type LeadStatus } from '@piel360/shared';

export class ListLeadsQueryDto {
  @IsOptional()
  @IsIn(LEAD_STATUS_VALUES)
  status?: LeadStatus;

  /** Busca en nombre, negocio, correo y teléfono. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsIn(LEAD_STATUS_VALUES)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
