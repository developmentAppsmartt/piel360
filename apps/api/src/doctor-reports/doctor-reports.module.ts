import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DoctorReportsController } from './doctor-reports.controller';
import { DoctorReportsService } from './doctor-reports.service';

@Module({
  imports: [PrismaModule, OrganizationsModule],
  providers: [DoctorReportsService],
  controllers: [DoctorReportsController],
  exports: [DoctorReportsService],
})
export class DoctorReportsModule {}
