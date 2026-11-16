import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/types';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';
import { PublicPlansService } from './public-plans.service';

@Controller()
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly publicPlans: PublicPlansService,
  ) {}

  /** Sin auth: la sección de precios de la landing. */
  @Get('public/plans')
  findPublicCatalog() {
    return this.publicPlans.findCatalog();
  }

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.plansService.findAll(user);
  }

  @Get('admin/plans')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('view_any_plan')
  findAllAdmin() {
    return this.plansService.findAllAdmin();
  }

  @Get('admin/analysis-providers')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('view_any_plan')
  findProviders() {
    return this.plansService.findProviders();
  }

  @Post('admin/plans')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('create_plan')
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch('admin/plans/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('update_plan')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Delete('admin/plans/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('delete_plan')
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
