import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';

@Controller()
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  /** Lista todas las configuraciones globales (público — solo valores no sensibles). */
  @Get('app-config')
  findAll() {
    return this.appConfigService.findAll();
  }

  /** Obtiene el valor de una clave específica. */
  @Get('app-config/:key')
  findOne(@Param('key') key: string) {
    return this.appConfigService.findByKey(key);
  }

  /** Actualiza o crea una clave de configuración — solo admins. */
  @Put('admin/app-config/:key')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('manage_app_config')
  upsert(
    @Param('key') key: string,
    @Body('value') value: string,
  ) {
    return this.appConfigService.upsert(key, value);
  }
}
