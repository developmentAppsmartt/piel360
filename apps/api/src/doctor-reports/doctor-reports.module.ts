import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AdminReportScopeService } from './admin-report-scope.service';
import { AdminReportsController } from './admin-reports.controller';
import { DoctorReportsController } from './doctor-reports.controller';
import { DoctorReportsService } from './doctor-reports.service';
import { AnalisisDermaPiel360ReportService } from './skiniver-report.service';

@Module({
  imports: [PrismaModule, OrganizationsModule],
  providers: [
    DoctorReportsService,
    AnalisisDermaPiel360ReportService,
    AdminReportScopeService,
  ],
  // El panel de admin ve los mismos reportes, con su propio alcance.
  controllers: [DoctorReportsController, AdminReportsController],
  exports: [DoctorReportsService, AnalisisDermaPiel360ReportService],
})
export class DoctorReportsModule {}
