import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlanPoolAvailabilityModule } from './plan-pool-availability.module';
import { PlansService } from './plans.service';
import { PublicPlansService } from './public-plans.service';

@Module({
  imports: [PlanPoolAvailabilityModule],
  controllers: [PlansController],
  providers: [PlansService, PublicPlansService],
})
export class PlansModule {}
