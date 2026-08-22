import { Module } from '@nestjs/common';
import { TreatmentsService } from './treatments.service';
import { TreatmentsController } from './treatments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { StorageModule } from '../storage/storage.module';
import { AnalysisConditionsModule } from '../analysis-conditions/analysis-conditions.module';

@Module({
  imports: [
    PrismaModule,
    DoctorsModule,
    StorageModule,
    AnalysisConditionsModule,
  ],
  providers: [TreatmentsService],
  controllers: [TreatmentsController],
})
export class TreatmentsModule {}
