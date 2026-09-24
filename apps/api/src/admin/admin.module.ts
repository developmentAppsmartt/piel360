import { Module } from '@nestjs/common';
import { PlanPoolAvailabilityModule } from '../plans/plan-pool-availability.module';
import { YoucamModule } from '../youcam/youcam.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { DoctorReportsModule } from '../doctor-reports/doctor-reports.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PerfectCorpUnitsService } from './perfectcorp-units.service';
import { SkiniverUnitsService } from './skiniver-units.service';

@Module({
  imports: [
    YoucamModule,
    SubscriptionsModule,
    PlanPoolAvailabilityModule,
    // Por SkiniverReportService: el reporte dermatológico es el mismo del
    // panel del doctor, con alcance global.
    DoctorReportsModule,
  ],
  providers: [AdminService, PerfectCorpUnitsService, SkiniverUnitsService],
  controllers: [AdminController],
})
export class AdminModule {}
