import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ClinicalPanelRoles } from '../auth/clinical-panel.roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { ReferralReportService } from './referral-report.service';

/** Configuración › Referidos (admin y empresa aliada). */
@Controller()
export class ReferralReportController {
  constructor(private readonly report: ReferralReportService) {}

  @Get('admin/referrals')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('admin.settings.referrals')
  listAll() {
    return this.report.rows();
  }

  @Get('organizations/me/referrals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ClinicalPanelRoles()
  async listMine(@CurrentUser() user: JwtPayload) {
    return this.report.rows(await this.report.alliedOrganizationOf(user.sub));
  }
}
