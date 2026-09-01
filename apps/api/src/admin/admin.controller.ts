import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/types';
import { AdminService } from './admin.service';
import { CreateSkiniverRechargeDto } from './dto/create-skiniver-recharge.dto';
import { PerfectCorpUnitsService } from './perfectcorp-units.service';
import { SkiniverUnitsService } from './skiniver-units.service';
import { PlanPoolAvailabilityService } from '../plans/plan-pool-availability.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly perfectCorpUnits: PerfectCorpUnitsService,
    private readonly skiniverUnits: SkiniverUnitsService,
    private readonly planPool: PlanPoolAvailabilityService,
  ) {}

  @Get('dashboard-stats')
  @RequirePermission('admin.dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  /** Saldo Perfect Corp (YouCam + Fitzpatrick) + costos por SKU. */
  @Get('bolsa-unidades/perfectcorp')
  @RequirePermission('admin.unit_wallet')
  getPerfectCorpUnits() {
    return this.perfectCorpUnits.getAestheticUnitPool();
  }

  /** Bolsa dermatológica (Skiniver) — recargas registradas en plataforma. */
  @Get('bolsa-unidades/skiniver')
  @RequirePermission('admin.unit_wallet')
  getSkiniverUnits() {
    return this.skiniverUnits.getDermUnitPool();
  }

  @Post('bolsa-unidades/skiniver/recharge')
  @RequirePermission('admin.unit_wallet')
  rechargeSkiniverUnits(
    @Body() dto: CreateSkiniverRechargeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.skiniverUnits.createRecharge(dto, BigInt(user.sub));
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

  @Get('map-markers')
  @RequirePermission('admin.maps')
  getMapMarkers(@Query('kind') kind?: 'doctor' | 'patient') {
    return this.adminService.getMapMarkers(kind);
  }
}
