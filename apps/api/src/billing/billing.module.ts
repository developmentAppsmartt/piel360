import { Module } from '@nestjs/common';
import { BillingPayoutCronService } from './billing-payout.cron';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, BillingPayoutCronService],
  exports: [BillingService],
})
export class BillingModule {}
