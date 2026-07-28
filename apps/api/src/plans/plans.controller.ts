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
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';

@Controller()
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.plansService.findAll();
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
