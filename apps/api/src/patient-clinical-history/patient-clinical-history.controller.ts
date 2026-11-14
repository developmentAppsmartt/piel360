import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/types';
import { SaveClinicalHistoryDto } from './dto/save-clinical-history.dto';
import { PatientClinicalHistoryService } from './patient-clinical-history.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PatientClinicalHistoryController {
  constructor(private readonly history: PatientClinicalHistoryService) {}

  @Get('clinical-history/catalog')
  catalog(@CurrentUser() user: JwtPayload) {
    return this.history.catalog(user);
  }

  @Get('patients/:id/clinical-history')
  get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.history.get(id, user);
  }

  @Put('patients/:id/clinical-history')
  save(
    @Param('id') id: string,
    @Body() dto: SaveClinicalHistoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.history.save(id, dto, user);
  }
}
