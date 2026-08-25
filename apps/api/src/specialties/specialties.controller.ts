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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { SpecialtiesService } from './specialties.service';

@Controller()
export class SpecialtiesController {
  constructor(private readonly specialties: SpecialtiesService) {}

  /** Público: catálogo activo para registro de doctores. */
  @Get('specialties')
  listActive() {
    return this.specialties.listActive();
  }

  @Get('admin/specialties')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  listAll() {
    return this.specialties.listAll();
  }

  @Post('admin/specialties')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  create(@Body() dto: CreateSpecialtyDto) {
    return this.specialties.create(dto);
  }

  @Patch('admin/specialties/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  update(@Param('id') id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.specialties.update(id, dto);
  }

  @Delete('admin/specialties/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  remove(@Param('id') id: string) {
    return this.specialties.remove(id);
  }
}
