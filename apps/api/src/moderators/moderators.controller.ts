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
import { CreateModeratorDto } from './dto/create-moderator.dto';
import { UpdateModeratorPermissionsDto } from './dto/update-moderator-permissions.dto';
import { ModeratorsService } from './moderators.service';

/**
 * Rutas bajo `admin/moderators` (mismo estilo que DoctorsController:
 * paths absolutos en `@Controller()` para evitar colisiones).
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class ModeratorsController {
  constructor(private readonly moderatorsService: ModeratorsService) {}

  @Get('admin/moderators')
  findAll() {
    return this.moderatorsService.findAll();
  }

  @Post('admin/moderators')
  create(@Body() dto: CreateModeratorDto) {
    return this.moderatorsService.create(dto);
  }

  @Get('admin/moderators/:id')
  findOne(@Param('id') id: string) {
    return this.moderatorsService.findOne(id);
  }

  @Patch('admin/moderators/:id/permissions')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateModeratorPermissionsDto,
  ) {
    return this.moderatorsService.updatePermissions(id, dto.permissions);
  }

  @Delete('admin/moderators/:id')
  remove(@Param('id') id: string) {
    return this.moderatorsService.remove(id);
  }
}
