import { Module } from '@nestjs/common';
import { PlanPoolAvailabilityModule } from '../plans/plan-pool-availability.module';
import { YoucamModule } from '../youcam/youcam.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PerfectCorpUnitsService } from './perfectcorp-units.service';
import { SkiniverUnitsService } from './skiniver-units.service';

@Module({
  imports: [YoucamModule, SubscriptionsModule, PlanPoolAvailabilityModule],
  providers: [AdminService, PerfectCorpUnitsService, SkiniverUnitsService],
  controllers: [AdminController],
})
export class AdminModule {}
