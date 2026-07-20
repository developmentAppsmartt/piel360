import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { YOUCAM_POLL_QUEUE } from './queues';
import { YoucamAnalysesService } from './youcam-analyses.service';
import { YoucamPollProcessor } from './youcam-poll.processor';
import { YoucamResultsService } from './youcam-results.service';
import { YoucamWebhookController } from './youcam-webhook.controller';
import { YoucamWebhookService } from './youcam-webhook.service';
import { YoucamController } from './youcam.controller';
import { YouCamService } from './youcam.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: YOUCAM_POLL_QUEUE }),
    PatientsModule,
    SubscriptionsModule,
    StorageModule,
  ],
  providers: [
    YouCamService,
    YoucamAnalysesService,
    YoucamResultsService,
    YoucamWebhookService,
    YoucamPollProcessor,
  ],
  controllers: [YoucamController, YoucamWebhookController],
})
export class YoucamModule {}
