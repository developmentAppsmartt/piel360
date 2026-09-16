import { IsISO8601, IsOptional, IsString } from 'class-validator';

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
}
