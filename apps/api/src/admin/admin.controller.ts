import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/types';
import { AdminService } from './admin.service';
import { CreateAnalisisDermaPiel360RechargeDto } from './dto/create-skiniver-recharge.dto';
import { AnalisisPiel360UnitsService } from './perfectcorp-units.service';
import { AnalisisDermaPiel360UnitsService } from './skiniver-units.service';
import { PlanPoolAvailabilityService } from '../plans/plan-pool-availability.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analisisPiel360Units: AnalisisPiel360UnitsService,
    private readonly analisisDermaPiel360Units: AnalisisDermaPiel360UnitsService,
    private readonly planPool: PlanPoolAvailabilityService,
  ) {}

  @Get('dashboard-stats')
  @RequirePermission('admin.dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  /** Saldo de la bolsa estetica (estetico + fototipo) + costos por SKU. */
  @Get('bolsa-unidades/analisispiel360')
  @RequirePermission('admin.unit_wallet')
  getAnalisisPiel360Units() {
    return this.analisisPiel360Units.getAestheticUnitPool();
  }

  /** Bolsa dermatológica — recargas registradas en plataforma. */
  @Get('bolsa-unidades/analisisdermapiel360')
  @RequirePermission('admin.unit_wallet')
  getAnalisisDermaPiel360Units() {
    return this.analisisDermaPiel360Units.getDermUnitPool();
  }

  @Post('bolsa-unidades/analisisdermapiel360/recharge')
  @RequirePermission('admin.unit_wallet')
  rechargeAnalisisDermaPiel360Units(
    @Body() dto: CreateAnalisisDermaPiel360RechargeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.analisisDermaPiel360Units.createRecharge(dto, BigInt(user.sub));
  }

  /** Planes activos sin créditos suficientes en la bolsa correspondiente. */
  @Get('bolsa-unidades/plan-alerts')
  @RequirePermission('view_any_plan')
  getPlanPoolAlerts() {
    return this.planPool.getAlerts();
  }

  @Get('reports')
  @RequirePermission('admin.reports')
  getReports(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: 'day' | 'month' | 'year',
  ) {
    return this.adminService.getReports(startDate, endDate, granularity);
  }

  /** Mismo reporte dermatológico del panel del doctor, con alcance global
   * (sin filtro por doctor). */
  @Get('reports/analisisdermapiel360')
  @RequirePermission('admin.reports')
  getAnalisisDermaPiel360Report(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAnalisisDermaPiel360Report(startDate, endDate);
  }

  @Get('map-markers')
  @RequirePermission('admin.maps')
  getMapMarkers(@Query('kind') kind?: 'doctor' | 'patient') {
    return this.adminService.getMapMarkers(kind);
  }
}
