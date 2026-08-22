import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { JwtPayload } from '../auth/types';
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { CreateRoutineStepDto } from './dto/create-routine-step.dto';
import { UpdateRoutineStepDto } from './dto/update-routine-step.dto';

@Controller('routines')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  getRoutines(@CurrentUser() user: JwtPayload) {
    return this.routinesService.getRoutines(user.sub);
  }

  /** Rutinas recomendadas para un análisis YouCam ya completado. */
  @Get('recommended/:analysisId')
  getRecommended(
    @CurrentUser() user: JwtPayload,
    @Param('analysisId') analysisId: string,
  ) {
    return this.routinesService.getRecommendedRoutines(user.sub, analysisId);
  }

  @Get(':id')
  getRoutine(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.routinesService.getRoutine(user.sub, id);
  }

  @Post()
  createRoutine(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRoutineDto,
  ) {
    return this.routinesService.createRoutine(user.sub, dto);
  }

  @Patch(':id')
  updateRoutine(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    return this.routinesService.updateRoutine(user.sub, id, dto);
  }

  @Delete(':id')
  deleteRoutine(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.routinesService.deleteRoutine(user.sub, id);
  }

  @Post(':id/steps')
  createStep(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateRoutineStepDto,
  ) {
    return this.routinesService.createStep(user.sub, id, dto);
  }

  @Patch(':id/steps/:stepId')
  updateStep(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateRoutineStepDto,
  ) {
    return this.routinesService.updateStep(user.sub, id, stepId, dto);
  }

  @Delete(':id/steps/:stepId')
  deleteStep(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
  ) {
    return this.routinesService.deleteStep(user.sub, id, stepId);
  }

  /** Upload de imagen/video/gif del paso — multipart/form-data, campo "file". */
  @Post(':id/steps/:stepId/media')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadStepMedia(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.routinesService.uploadStepMedia(user.sub, id, stepId, file);
  }
}
