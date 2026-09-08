import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/types';
import { SkinHealthReportQueryDto } from './dto/skin-health-report-query.dto';
import { DoctorReportsService } from './doctor-reports.service';

/**
 * Ruta `doctor/reports` (no `reports`, que ya es el PDF público por análisis).
 * Solo JwtAuthGuard: el control fino es el permiso de equipo `reports`, que se
 * valida dentro del service — mismo criterio que patients/analyses.
 */
@Controller('doctor/reports')
@UseGuards(JwtAuthGuard)
export class DoctorReportsController {
  constructor(private readonly doctorReports: DoctorReportsService) {}

  @Get('skin-health')
  skinHealth(
    @CurrentUser() user: JwtPayload,
    @Query() query: SkinHealthReportQueryDto,
  ) {
    return this.doctorReports.getSkinHealthReport(user.sub, query);
  }
}
