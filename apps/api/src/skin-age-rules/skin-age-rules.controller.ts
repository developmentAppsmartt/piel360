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
import { CurrentUser } from '../auth/current-user.decorator';
import { ClinicalPanelOrSuperadminRoles } from '../auth/clinical-panel.roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import {
  CreateSkinAgeRuleDto,
  SimulateSkinAgeRuleDto,
  UpdateSkinAgeRuleDto,
} from './dto/skin-age-rule.dto';
import { SkinAgeRulesService } from './skin-age-rules.service';

@Controller('skin-age-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ClinicalPanelOrSuperadminRoles()
export class SkinAgeRulesController {
  constructor(private readonly skinAgeRulesService: SkinAgeRulesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.skinAgeRulesService.listRules(user.sub);
  }

  @Post('simulate')
  simulate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SimulateSkinAgeRuleDto,
  ) {
    return this.skinAgeRulesService.simulate(user.sub, dto);
  }

  @Get('recommended/:analysisId')
  recommendForAnalysis(
    @CurrentUser() user: JwtPayload,
    @Param('analysisId') analysisId: string,
  ) {
    return this.skinAgeRulesService.recommendForAnalysis(user.sub, analysisId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSkinAgeRuleDto) {
    return this.skinAgeRulesService.createRule(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSkinAgeRuleDto,
  ) {
    return this.skinAgeRulesService.updateRule(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.skinAgeRulesService.deleteRule(user.sub, id);
  }
}
