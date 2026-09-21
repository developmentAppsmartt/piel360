import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { FitzpatrickRulesModule } from '../fitzpatrick-rules/fitzpatrick-rules.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { ReportsModule } from '../reports/reports.module';
import { RoutinesModule } from '../routines/routines.module';
import { SkinAgeRulesModule } from '../skin-age-rules/skin-age-rules.module';
import { SkiniverModule } from '../skiniver/skiniver.module';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TreatmentsModule } from '../treatments/treatments.module';
import { AnalysesService } from './analyses.service';
import { AnalysesController } from './analyses.controller';
import { AnalysisImagesProcessor } from './analysis-images.processor';
import { AnalysisImageUrlsService } from './analysis-image-urls.service';
import { ANALYSIS_IMAGES_QUEUE, ENCYCLOPEDIA_QUEUE } from './queues';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: ANALYSIS_IMAGES_QUEUE },
      { name: ENCYCLOPEDIA_QUEUE },
    ),
    OrganizationsModule,
    DoctorsModule,
    PatientsModule,
    NotificationsModule,
    SkinAgeRulesModule,
    FitzpatrickRulesModule,
    RoutinesModule,
    TreatmentsModule,
    SkiniverModule,
    SubscriptionsModule,
    StorageModule,
    ReportsModule,
  ],
  providers: [
    AnalysesService,
    AnalysisImagesProcessor,
    AnalysisImageUrlsService,
  ],
  controllers: [AnalysesController],
})
export class AnalysesModule {}
