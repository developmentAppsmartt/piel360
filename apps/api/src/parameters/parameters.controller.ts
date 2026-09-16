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
import {
  CreateParameterDto,
  CreateParameterTypeDto,
  UpdateParameterDto,
} from './dto/parameter.dto';
import { ParametersService } from './parameters.service';

@Controller()
export class ParametersController {
  constructor(private readonly parametersService: ParametersService) {}

  /** Público — usado por los combobox de los formularios de registro. */
  @Get('parameters/:typeSlug')
  findActive(@Param('typeSlug') typeSlug: string) {
    return this.parametersService.findActive(typeSlug);
  }

  @Get('admin/parameter-types')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('manage_app_config')
  listTypes() {
    return this.parametersService.listTypes();
  }

  @Post('admin/parameter-types')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('manage_app_config')
  createType(@Body() dto: CreateParameterTypeDto) {
    return this.parametersService.createType(dto);
  }

  @Get('admin/parameters/:typeSlug')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('manage_app_config')
  findAll(@Param('typeSlug') typeSlug: string) {
    return this.parametersService.findAll(typeSlug);
  }

  @Post('admin/parameters/:typeSlug')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('manage_app_config')
  create(@Param('typeSlug') typeSlug: string, @Body() dto: CreateParameterDto) {
    return this.parametersService.create(typeSlug, dto);
  }

  @Patch('admin/parameters/:typeSlug/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('manage_app_config')
  update(
    @Param('typeSlug') typeSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateParameterDto,
  ) {
    return this.parametersService.update(typeSlug, id, dto);
  }

  @Delete('admin/parameters/:typeSlug/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('manage_app_config')
  remove(@Param('typeSlug') typeSlug: string, @Param('id') id: string) {
    return this.parametersService.remove(typeSlug, id);
  }
}
