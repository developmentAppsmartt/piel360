import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export class SkiniverReportQueryDto {
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

  /** Sin efecto acá (las series de este reporte cubren exactamente from..to),
   * pero la pantalla de Reportes manda los mismos filtros a los tres endpoints
   * y el ValidationPipe rechaza lo que no esté declarado. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(24)
  trendMonths?: number;
}
