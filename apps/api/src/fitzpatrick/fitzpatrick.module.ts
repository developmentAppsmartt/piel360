import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { FitzpatrickAnalysesService } from './fitzpatrick-analyses.service';
import { FitzpatrickController } from './fitzpatrick.controller';
import { FitzpatrickService } from './fitzpatrick.service';

@Module({
  imports: [PatientsModule, SubscriptionsModule, StorageModule],
  providers: [FitzpatrickService, FitzpatrickAnalysesService],
  controllers: [FitzpatrickController],
})
export class FitzpatrickModule {}
