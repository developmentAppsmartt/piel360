import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { CreateModeratorDto } from './dto/create-moderator.dto';
import { ModeratorsService } from './moderators.service';

/**
 * Rutas bajo `admin/moderators` (mismo estilo que DoctorsController:
 * paths absolutos en `@Controller()` para evitar colisiones).
 */
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModeratorsController {
  constructor(private readonly moderatorsService: ModeratorsService) {}

  @Get('admin/moderators')
  @RequirePermission('admin.moderators')
  findAll() {
    return this.moderatorsService.findAll();
  }

  @Post('admin/moderators')
  @RequirePermission('admin.moderators')
  create(@Body() dto: CreateModeratorDto) {
    return this.moderatorsService.create(dto);
  }

  @Get('admin/moderators/:id')
  @RequirePermission('admin.moderators')
  findOne(@Param('id') id: string) {
    return this.moderatorsService.findOne(id);
  }

  @Delete('admin/moderators/:id')
  @RequirePermission('admin.moderators')
  remove(@Param('id') id: string) {
    return this.moderatorsService.remove(id);
  }
}
