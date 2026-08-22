import { Module } from '@nestjs/common';
import { AnalysisConditionsService } from './analysis-conditions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [PrismaModule, DoctorsModule],
  providers: [AnalysisConditionsService],
  exports: [AnalysisConditionsService],
})
export class AnalysisConditionsModule {}
