import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export class SkinHealthReportQueryDto {
  /** YYYY-MM-DD inclusivo. Default: hace 30 días. */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** YYYY-MM-DD inclusivo. Default: hoy. */
  @IsOptional()
  @IsISO8601()
  to?: string;

  /** Solo el dueño del equipo puede filtrar por profesional (ver PatientsService). */
  @IsOptional()
  @IsString()
  professionalUserId?: string;

  /** Meses de la ventana de tendencia (independiente de from/to). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(24)
  trendMonths?: number;
}
