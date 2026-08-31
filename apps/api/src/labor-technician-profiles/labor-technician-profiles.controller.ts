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
import { CreateLaborTechnicianProfileDto } from './dto/create-labor-technician-profile.dto';
import { UpdateLaborTechnicianProfileDto } from './dto/update-labor-technician-profile.dto';
import { LaborTechnicianProfilesService } from './labor-technician-profiles.service';

@Controller()
export class LaborTechnicianProfilesController {
  constructor(
    private readonly laborTechnicianProfilesService: LaborTechnicianProfilesService,
  ) {}

  @Get('labor-technician-profiles')
  findActive() {
    return this.laborTechnicianProfilesService.findActive();
  }

  @Get('admin/labor-technician-profiles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('view_any_role')
  findAll() {
    return this.laborTechnicianProfilesService.findAll();
  }

  @Post('admin/labor-technician-profiles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('create_role')
  create(@Body() dto: CreateLaborTechnicianProfileDto) {
    return this.laborTechnicianProfilesService.create(dto);
  }

  @Patch('admin/labor-technician-profiles/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('update_role')
  update(@Param('id') id: string, @Body() dto: UpdateLaborTechnicianProfileDto) {
    return this.laborTechnicianProfilesService.update(id, dto);
  }

  @Delete('admin/labor-technician-profiles/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('delete_role')
  remove(@Param('id') id: string) {
    return this.laborTechnicianProfilesService.remove(id);
  }
}
