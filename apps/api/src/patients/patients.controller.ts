import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/types';
import { CreatePatientDto } from './dto/create-patient.dto';
import { SurveyDto } from './dto/survey.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('me/survey')
  getMySurvey(@CurrentUser() user: JwtPayload) {
    return this.patientsService.getMySurvey(user.sub);
  }

  @Post('me/survey')
  submitMySurvey(@CurrentUser() user: JwtPayload, @Body() dto: SurveyDto) {
    return this.patientsService.submitMySurvey(user.sub, dto);
  }

  @Post('patients')
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: JwtPayload) {
    return this.patientsService.create(dto, user);
  }

  @Get('patients')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.patientsService.findAll(user);
  }

  @Get('patients/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.findOne(id, user);
  }

  @Patch('patients/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.update(id, dto, user);
  }

  @Get('patients/:id/analyses')
  findAnalyses(
    @Param('id') id: string,
    @Query('withCoords') withCoords: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.findAnalyses(id, user, withCoords === 'true');
  }
}
