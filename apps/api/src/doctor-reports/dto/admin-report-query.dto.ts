import { IsNumberString, IsOptional } from 'class-validator';
import { SkinHealthReportQueryDto } from './skin-health-report-query.dto';

/**
 * Los reportes del panel del doctor, vistos por el admin. Sin alcance = toda
 * la plataforma; `organizationId` = lo que ve el dueño de esa empresa;
 * `professionalUserId` (heredado) = lo de ese profesional.
 */
export class AdminReportQueryDto extends SkinHealthReportQueryDto {
  @IsOptional()
  @IsNumberString()
  organizationId?: string;
}
