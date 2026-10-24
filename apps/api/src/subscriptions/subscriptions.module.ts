import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { MailModule } from '../mail/mail.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlanPoolAvailabilityModule } from '../plans/plan-pool-availability.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OverlapCancelRestore } from './overlap-cancel-restore';
import { SubscriptionCreditsService } from './subscription-credits.service';
import { SubscriptionPoolService } from './subscription-pool.service';
import { SubscriptionsAdminService } from './subscriptions-admin.service';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    OrganizationsModule,
    BillingModule,
    forwardRef(() => PlanPoolAvailabilityModule),
  ],
  providers: [
    SubscriptionsService,
    SubscriptionsAdminService,
    SubscriptionCreditsService,
    SubscriptionPoolService,
    OverlapCancelRestore,
  ],
  controllers: [SubscriptionsController],
  exports: [
    SubscriptionsService,
    SubscriptionCreditsService,
    SubscriptionPoolService,
  ],
})
export class SubscriptionsModule {}
