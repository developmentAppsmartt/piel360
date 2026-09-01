import { Module, forwardRef } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlanPoolAvailabilityModule } from '../plans/plan-pool-availability.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionPoolService } from './subscription-pool.service';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    OrganizationsModule,
    forwardRef(() => PlanPoolAvailabilityModule),
  ],
  providers: [SubscriptionsService, SubscriptionPoolService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, SubscriptionPoolService],
})
export class SubscriptionsModule {}
