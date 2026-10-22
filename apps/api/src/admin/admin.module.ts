import { Module } from '@nestjs/common';
import { PlanPoolAvailabilityModule } from '../plans/plan-pool-availability.module';
import { AnalisisPiel360Module } from '../youcam/youcam.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { DoctorReportsModule } from '../doctor-reports/doctor-reports.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AnalisisPiel360UnitsService } from './perfectcorp-units.service';
import { AnalisisDermaPiel360UnitsService } from './skiniver-units.service';

@Module({
  imports: [
    AnalisisPiel360Module,
    SubscriptionsModule,
    PlanPoolAvailabilityModule,
    // Por AnalisisDermaPiel360ReportService: el reporte dermatológico es el mismo del
    // panel del doctor, con alcance global.
    DoctorReportsModule,
  ],
  providers: [AdminService, AnalisisPiel360UnitsService, AnalisisDermaPiel360UnitsService],
  controllers: [AdminController],
})
export class AdminModule {}
