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
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateSpecialtyPlanPermissionsDto } from './dto/update-specialty-plan-permissions.dto';
import { RolesService } from './roles.service';
import { SpecialtyAccessService } from '../specialty-access/specialty-access.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly specialtyAccess: SpecialtyAccessService,
  ) {}

  @Get('roles')
  @RequirePermission('view_any_role')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  @RequirePermission('view_any_role')
  findPermissions() {
    return this.rolesService.findPermissions();
  }

  @Post('roles')
  @RequirePermission('create_role')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch('roles/:id')
  @RequirePermission('update_role')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete('roles/:id')
  @RequirePermission('delete_role')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  @Get('specialty-plan-permissions')
  @RequirePermission('view_any_role')
  findSpecialtyPlanPermissions() {
    return this.specialtyAccess.getSpecialtyPlanMatrix();
  }

  @Patch('specialty-plan-permissions')
  @RequirePermission('update_role')
  updateSpecialtyPlanPermissions(@Body() dto: UpdateSpecialtyPlanPermissionsDto) {
    return this.specialtyAccess.updateSpecialtyPlanPermissions(dto.roleId, {
      skiniver: dto.skiniver,
      youcam: dto.youcam,
      fitzpatrick: dto.fitzpatrick,
    });
  }
}
