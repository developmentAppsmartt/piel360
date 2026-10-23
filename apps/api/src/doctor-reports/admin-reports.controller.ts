import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { AdminReportScopeService } from './admin-report-scope.service';
import { DoctorReportsService } from './doctor-reports.service';
import { AdminReportQueryDto } from './dto/admin-report-query.dto';
import { resolveReportRange } from './report-range';
import { AnalisisDermaPiel360ReportService } from './skiniver-report.service';

const DEFAULT_RANGE_DAYS = 30;

/** Los reportes que ven doctores y empresas, desde el panel de admin. La
 * pestaña «General» (métricas de plataforma) sigue en AdminController. */
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('admin.reports')
export class AdminReportsController {
  constructor(
    private readonly scope: AdminReportScopeService,
    private readonly reports: DoctorReportsService,
    private readonly derm: AnalisisDermaPiel360ReportService,
  ) {}

  @Get('scopes')
  scopes() {
    return this.scope.options();
  }

  @Get('skin-health')
  async skinHealth(@Query() query: AdminReportQueryDto) {
    return this.reports.skinHealthFor(await this.scope.doctorIds(query), query);
  }

  @Get('lifestyle')
  async lifestyle(@Query() query: AdminReportQueryDto) {
    return this.reports.lifestyleFor(await this.scope.doctorIds(query), query);
  }

  @Get('analisisdermapiel360')
  async analisisDermaPiel360(@Query() query: AdminReportQueryDto) {
    const { from, to, toExclusive } = resolveReportRange(
      query,
      DEFAULT_RANGE_DAYS,
    );
    return this.derm.build(await this.scope.doctorIds(query), {
      from,
      to,
      toExclusive,
    });
  }
}
