import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ClinicalPanelRoles } from '../auth/clinical-panel.roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { ScoreConfigService } from './score-config.service';

/** Configuración → Personalización → Rangos de puntuación (solo el dueño). */
@Controller('doctor/score-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ClinicalPanelRoles()
export class DoctorScoreConfigController {
  constructor(private readonly scoreConfig: ScoreConfigService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.scoreConfig.getOwn(user);
  }

  /** El cuerpo se valida con `sanitizeYoucamScoreConfig` (JSON anidado por métrica). */
  @Put()
  update(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.scoreConfig.update(user, body);
  }
}

/** Rangos y textos que aplica la app del usuario autenticado. */
@Controller('auth/me/score-config')
@UseGuards(JwtAuthGuard)
export class MyScoreConfigController {
  constructor(private readonly scoreConfig: ScoreConfigService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.scoreConfig.getEffective(user.sub);
  }
}
