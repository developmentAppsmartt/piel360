import { Module } from '@nestjs/common';
import { AnalysisConditionsService } from './analysis-conditions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [PrismaModule, DoctorsModule, OrganizationsModule],
  providers: [AnalysisConditionsService],
  exports: [AnalysisConditionsService],
})
export class AnalysisConditionsModule {}
