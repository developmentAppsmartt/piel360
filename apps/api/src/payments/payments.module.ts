import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WompiWebhookController } from './wompi-webhook.controller';

@Module({
  imports: [SubscriptionsModule],
  providers: [PaymentsService],
  controllers: [PaymentsController, WompiWebhookController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
