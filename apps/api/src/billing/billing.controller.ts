import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import type { JwtPayload } from '../auth/types';
import { BillingDashboardService } from './billing-dashboard.service';
import { BillingService } from './billing.service';
import { BillingDashboardQueryDto } from './dto/billing-dashboard-query.dto';
import { UpdateSalesGoalsDto } from './dto/update-sales-goals.dto';
import { FxRatesService } from './fx-rates.service';
import { SalesGoalsService } from './sales-goals.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly dashboard: BillingDashboardService,
    private readonly salesGoals: SalesGoalsService,
    private readonly fxRates: FxRatesService,
  ) {}

  @Get('admin/billing')
  @RequirePermission('admin.billing')
  getDashboard(@Query() query: BillingDashboardQueryDto) {
    return this.dashboard.getDashboard(query);
  }

  @Put('admin/billing/goals')
  @RequirePermission('admin.billing')
  updateGoals(@Body() dto: UpdateSalesGoalsDto) {
    return this.salesGoals.update(dto);
  }

  @Get('admin/billing/invoices')
  @RequirePermission('admin.billing')
  listInvoices() {
    return this.billing.listInvoices();
  }

  @Get('admin/billing/allied-balances')
  @RequirePermission('admin.billing')
  alliedBalances() {
    return this.billing.getAlliedBalances();
  }

  @Get('admin/billing/fx-rates')
  @RequirePermission('manage_app_config')
  getFxRates() {
    return this.billing.getBillingRates();
  }

  /** Fuerza actualización desde https://co.dolarapi.com (también a las 06:00 Bogotá). */
  @Post('admin/billing/fx-rates/refresh')
  @RequirePermission('manage_app_config')
  refreshFxRates() {
    return this.fxRates.refreshFromDolarApi();
  }

  @Get('admin/billing/wompi-banks')
  @RequirePermission('admin.settings.allied_companies')
  listBanks() {
    return this.billing.listWompiPayoutBanksSafe();
  }

  @Post('admin/billing/allied/:organizationId/disperse')
  @RequirePermission('admin.billing')
  disperse(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.billing.disperseAlliedCommissions(
      organizationId,
      user.sub,
      'manual',
    );
  }

  @Post('admin/billing/allied/disperse-all')
  @RequirePermission('admin.billing')
  disperseAll(@CurrentUser() user: JwtPayload) {
    return this.billing.disperseAllPendingCommissions('manual', user.sub);
  }
}
