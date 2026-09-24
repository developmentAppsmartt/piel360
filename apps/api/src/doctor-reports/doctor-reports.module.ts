import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DoctorReportsController } from './doctor-reports.controller';
import { DoctorReportsService } from './doctor-reports.service';
import { SkiniverReportService } from './skiniver-report.service';

@Module({
  imports: [PrismaModule, OrganizationsModule],
  providers: [DoctorReportsService, SkiniverReportService],
  controllers: [DoctorReportsController],
  // SkiniverReportService se exporta para el panel de admin, que arma el mismo
  // reporte sin filtro por doctor.
  exports: [DoctorReportsService, SkiniverReportService],
})
export class DoctorReportsModule {}
