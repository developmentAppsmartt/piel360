import {
  Body,
  Controller,
  Delete,
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
import { SkinAgeRecommendationsService } from '../skin-age-rules/skin-age-recommendations.service';
import { ComparisonReportService } from './comparison-report/comparison-report.service';
import { ComparisonReportDto } from './dto/comparison-report.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { CreateAnalysisRequestDto } from './dto/create-analysis-request.dto';
import { AssignPatientDoctorDto } from './dto/assign-patient-doctor.dto';
import { SurveyDto } from './dto/survey.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientAnalysisRequestsService } from './patient-analysis-requests.service';
import { PatientInviteService } from './patient-invite.service';
import { PatientWriteService } from './patient-write.service';
import { PatientsService } from './patients.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly patientWrite: PatientWriteService,
    private readonly analysisRequests: PatientAnalysisRequestsService,
    private readonly skinAgeRecommendations: SkinAgeRecommendationsService,
    private readonly patientInviteService: PatientInviteService,
    private readonly comparisonReport: ComparisonReportService,
  ) {}

  @Get('me/survey')
  getMySurvey(@CurrentUser() user: JwtPayload) {
    return this.patientsService.getMySurvey(user.sub);
  }

  @Post('me/survey')
  submitMySurvey(@CurrentUser() user: JwtPayload, @Body() dto: SurveyDto) {
    return this.patientsService.submitMySurvey(user.sub, dto);
  }

  /** Consejos según reglas de edad de piel del médico (app paciente). */
  @Get('me/skin-care-tips')
  getMySkinCareTips(@CurrentUser() user: JwtPayload) {
    return this.skinAgeRecommendations.recommendForPatientUser(user.sub);
  }

  @Get('me/analysis-requests/pending')
  getMyPendingAnalysisRequests(@CurrentUser() user: JwtPayload) {
    return this.analysisRequests.findMyPending(user.sub);
  }

  @Patch('me/analysis-requests/:id/complete')
  completeMyAnalysisRequest(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.analysisRequests.completeMine(id, user.sub);
  }

  @Post('patients')
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: JwtPayload) {
    return this.patientWrite.create(dto, user);
  }

  @Get('patients/me')
  findMe(@CurrentUser() user: JwtPayload) {
    return this.patientsService.findMe(user.sub);
  }

  @Get('patients')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('professionalUserId') professionalUserId?: string,
  ) {
    return this.patientsService.findAll(user, { professionalUserId });
  }

  @Post('patients/:id/analysis-requests')
  createAnalysisRequest(
    @Param('id') id: string,
    @Body() dto: CreateAnalysisRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.analysisRequests.create(id, dto, user);
  }

  @Get('patients/:id/analysis-requests/pending')
  listPendingAnalysisRequests(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.analysisRequests.findPending(id, user);
  }

  @Delete('patients/:id/analysis-requests/:requestId')
  cancelAnalysisRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.analysisRequests.cancel(id, requestId, user);
  }

  @Get('patients/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.findOne(id, user);
  }

  /** PDF comparativo entre dos análisis (pestaña Comparaciones). */
  @Post('patients/:id/comparison-report')
  comparisonReportPdf(
    @Param('id') id: string,
    @Body() dto: ComparisonReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.comparisonReport.generate(id, dto, user);
  }

  @Post('patients/:id/invite')
  invite(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.patientInviteService.sendInvite(id, user);
  }

  @Post('patients/:id/assign-doctor')
  assignDoctor(
    @Param('id') id: string,
    @Body() dto: AssignPatientDoctorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientWrite.assignDoctor(id, dto.doctor_id, user);
  }

  @Patch('patients/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientWrite.update(id, dto, user);
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
