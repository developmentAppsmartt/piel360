import { Module } from '@nestjs/common';
import { ReferralReportController } from './referral-report.controller';
import { ReferralReportService } from './referral-report.service';

@Module({
  controllers: [ReferralReportController],
  providers: [ReferralReportService],
})
export class ReferralReportModule {}
