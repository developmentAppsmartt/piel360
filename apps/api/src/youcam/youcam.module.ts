import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { ReportsModule } from '../reports/reports.module';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { YOUCAM_POLL_QUEUE } from './queues';
import { AnalisisPiel360AnalysesService } from './youcam-analyses.service';
import { AnalisisPiel360PollProcessor } from './youcam-poll.processor';
import { AnalisisPiel360ResultsService } from './youcam-results.service';
import { AnalisisPiel360WebhookController } from './youcam-webhook.controller';
import { AnalisisPiel360WebhookService } from './youcam-webhook.service';
import { AnalisisPiel360Controller } from './youcam.controller';
import { AnalisisPiel360Service } from './youcam.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: YOUCAM_POLL_QUEUE }),
    PatientsModule,
    forwardRef(() => SubscriptionsModule),
    StorageModule,
    ReportsModule,
  ],
  providers: [
    AnalisisPiel360Service,
    AnalisisPiel360AnalysesService,
    AnalisisPiel360ResultsService,
    AnalisisPiel360WebhookService,
    AnalisisPiel360PollProcessor,
  ],
  controllers: [AnalisisPiel360Controller, AnalisisPiel360WebhookController],
  exports: [AnalisisPiel360Service],
})
export class AnalisisPiel360Module {}
