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
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { SpecialtiesService } from './specialties.service';

@Controller()
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Get('specialties')
  findActive() {
    return this.specialtiesService.findActive();
  }

  @Get('admin/specialties')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('view_any_role')
  findAll() {
    return this.specialtiesService.findAll();
  }

  @Post('admin/specialties')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('create_role')
  create(@Body() dto: CreateSpecialtyDto) {
    return this.specialtiesService.create(dto);
  }

  @Patch('admin/specialties/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('update_role')
  update(@Param('id') id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.specialtiesService.update(id, dto);
  }

  @Delete('admin/specialties/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('delete_role')
  remove(@Param('id') id: string) {
    return this.specialtiesService.remove(id);
  }
}
