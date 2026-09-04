import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ClinicalPanelOrSuperadminRoles } from '../auth/clinical-panel.roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { AgendaService } from './agenda.service';
import {
  CreateAppointmentDto,
  CreateBlockedDayDto,
  PatientRequestAppointmentDto,
  ReplaceWeeklySlotsDto,
  UpdateAppointmentStatusDto,
} from './dto/agenda.dto';

@Controller('agenda')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  // ─── Profesional / empresa ───────────────────────────────────────────────

  @Get('overview')
  @ClinicalPanelOrSuperadminRoles()
  overview(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agenda.getDoctorOverview(user.sub, from, to);
  }

  @Get('weekly-slots')
  @ClinicalPanelOrSuperadminRoles()
  weeklySlots(@CurrentUser() user: JwtPayload) {
    return this.agenda.getWeeklySlots(user.sub);
  }

  @Put('weekly-slots')
  @ClinicalPanelOrSuperadminRoles()
  replaceWeeklySlots(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReplaceWeeklySlotsDto,
  ) {
    return this.agenda.replaceWeeklySlots(user.sub, dto);
  }

  @Get('blocked-days')
  @ClinicalPanelOrSuperadminRoles()
  blockedDays(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agenda.listBlockedDays(user.sub, from, to);
  }

  @Post('blocked-days')
  @ClinicalPanelOrSuperadminRoles()
  createBlockedDay(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBlockedDayDto,
  ) {
    return this.agenda.createBlockedDay(user.sub, dto);
  }

  @Delete('blocked-days/:id')
  @ClinicalPanelOrSuperadminRoles()
  deleteBlockedDay(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.agenda.deleteBlockedDay(user.sub, id);
  }

  @Get('appointments')
  @ClinicalPanelOrSuperadminRoles()
  listAppointments(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agenda.listDoctorAppointments(user.sub, from, to);
  }

  @Post('appointments')
  @ClinicalPanelOrSuperadminRoles()
  propose(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.agenda.proposeAppointment(user.sub, dto);
  }

  @Patch('appointments/:id')
  @ClinicalPanelOrSuperadminRoles()
  updateAsDoctor(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.agenda.updateAppointmentAsDoctor(user.sub, id, dto);
  }

  // ─── Paciente ────────────────────────────────────────────────────────────

  @Get('me/doctor-calendar')
  @Roles('patient')
  myDoctorCalendar(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agenda.getMyDoctorAgenda(user.sub, from, to);
  }

  @Get('me/appointments')
  @Roles('patient')
  myAppointments(@CurrentUser() user: JwtPayload) {
    return this.agenda.listMyAppointments(user.sub);
  }

  @Post('me/appointments')
  @Roles('patient')
  requestAppointment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PatientRequestAppointmentDto,
  ) {
    return this.agenda.requestAppointment(user.sub, dto);
  }

  @Patch('me/appointments/:id')
  @Roles('patient')
  updateAsPatient(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.agenda.updateAppointmentAsPatient(user.sub, id, dto);
  }
}
