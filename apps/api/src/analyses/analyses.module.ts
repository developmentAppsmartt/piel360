import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';
import { SkiniverModule } from '../skiniver/skiniver.module';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AnalysesService } from './analyses.service';
import { AnalysesController } from './analyses.controller';
import { AnalysisImagesProcessor } from './analysis-images.processor';
import { ANALYSIS_IMAGES_QUEUE, ENCYCLOPEDIA_QUEUE } from './queues';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: ANALYSIS_IMAGES_QUEUE },
      { name: ENCYCLOPEDIA_QUEUE },
    ),
    DoctorsModule,
    PatientsModule,
    SkiniverModule,
    SubscriptionsModule,
    StorageModule,
  ],
  providers: [AnalysesService, AnalysisImagesProcessor],
  controllers: [AnalysesController],
})
export class AnalysesModule {}
