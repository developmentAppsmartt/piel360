import { Module } from '@nestjs/common';
import { BillingDashboardService } from './billing-dashboard.service';
import { BillingPayoutCronService } from './billing-payout.cron';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { FxRatesCronService } from './fx-rates.cron';
import { FxRatesService } from './fx-rates.service';
import { SalesGoalsService } from './sales-goals.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingDashboardService,
    SalesGoalsService,
    BillingPayoutCronService,
    FxRatesService,
    FxRatesCronService,
  ],
  exports: [BillingService, FxRatesService],
})
export class BillingModule {}
