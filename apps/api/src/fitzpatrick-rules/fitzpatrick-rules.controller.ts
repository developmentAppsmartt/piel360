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
  CreateFitzpatrickRuleDto,
  SimulateFitzpatrickRuleDto,
  UpdateFitzpatrickRuleDto,
} from './dto/fitzpatrick-rule.dto';
import { FitzpatrickRulesService } from './fitzpatrick-rules.service';

@Controller('fitzpatrick-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ClinicalPanelOrSuperadminRoles()
export class FitzpatrickRulesController {
  constructor(
    private readonly fitzpatrickRulesService: FitzpatrickRulesService,
  ) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.fitzpatrickRulesService.listRules(user.sub);
  }

  @Post('simulate')
  simulate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SimulateFitzpatrickRuleDto,
  ) {
    return this.fitzpatrickRulesService.simulate(user.sub, dto);
  }

  @Get('recommended/:analysisId')
  recommendForAnalysis(
    @CurrentUser() user: JwtPayload,
    @Param('analysisId') analysisId: string,
  ) {
    return this.fitzpatrickRulesService.recommendForAnalysis(
      user.sub,
      analysisId,
    );
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFitzpatrickRuleDto,
  ) {
    return this.fitzpatrickRulesService.createRule(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFitzpatrickRuleDto,
  ) {
    return this.fitzpatrickRulesService.updateRule(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.fitzpatrickRulesService.deleteRule(user.sub, id);
  }
}
