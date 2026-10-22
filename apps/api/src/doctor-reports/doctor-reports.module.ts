import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DoctorReportsController } from './doctor-reports.controller';
import { DoctorReportsService } from './doctor-reports.service';
import { AnalisisDermaPiel360ReportService } from './skiniver-report.service';

@Module({
  imports: [PrismaModule, OrganizationsModule],
  providers: [DoctorReportsService, AnalisisDermaPiel360ReportService],
  controllers: [DoctorReportsController],
  // AnalisisDermaPiel360ReportService se exporta para el panel de admin, que arma el mismo
  // reporte sin filtro por doctor.
  exports: [DoctorReportsService, AnalisisDermaPiel360ReportService],
})
export class DoctorReportsModule {}
