import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { YoucamModule } from '../youcam/youcam.module';
import { PlanPoolAvailabilityService } from './plan-pool-availability.service';

/** Bolsa vs planes — módulo aparte para evitar ciclos Subscriptions ↔ Youcam ↔ Plans. */
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => YoucamModule),
  ],
  providers: [PlanPoolAvailabilityService],
  exports: [PlanPoolAvailabilityService],
})
export class PlanPoolAvailabilityModule {}
