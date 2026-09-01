import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import { StorageService } from '../storage/storage.service';
import { AnalysisConditionsService } from '../analysis-conditions/analysis-conditions.service';
import type { CreateRoutineDto } from './dto/create-routine.dto';
import type { UpdateRoutineDto } from './dto/update-routine.dto';
import type { CreateRoutineStepDto } from './dto/create-routine-step.dto';
import type { UpdateRoutineStepDto } from './dto/update-routine-step.dto';

@Injectable()
export class RoutinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
    private readonly storage: StorageService,
    private readonly analysisConditions: AnalysisConditionsService,
  ) {}

  private async catalogDoctorId(userId: string) {
    const ctx = await this.orgContext.assertTeamPermissionForUser(
      userId,
      'routines',
    );
    return ctx.catalogDoctorId;
  }

  private async ensureRoutineOwner(routineId: bigint, doctorId: bigint) {
    const routine = await this.prisma.routine.findUnique({
      where: { id: routineId },
    });
    if (!routine) throw new NotFoundException('Rutina no encontrada');
    if (routine.doctorId !== doctorId)
      throw new ForbiddenException('No tienes acceso a esta rutina');
    return routine;
  }

  private async ensureStepOwner(stepId: bigint, doctorId: bigint) {
    const step = await this.prisma.routineStep.findUnique({
      where: { id: stepId },
      include: { routine: true },
    });
    if (!step) throw new NotFoundException('Paso no encontrado');
    if (step.routine.doctorId !== doctorId)
      throw new ForbiddenException('No tienes acceso a este paso');
    return step;
  }

  /** Si mediaUrl es un key de S3 (no empieza con http), genera URL firmada
   *  (1h) — mismo criterio que ProductsService#resolveImageUrl. */
  private async resolveStepMedia<T extends { mediaUrl: string | null }>(
    step: T,
  ): Promise<T> {
    if (
      !step.mediaUrl ||
      step.mediaUrl.startsWith('http://') ||
      step.mediaUrl.startsWith('https://')
    ) {
      return step;
    }
    const signedUrl = await this.storage.getSignedUrl(step.mediaUrl);
    return { ...step, mediaUrl: signedUrl };
  }

  private async resolveStepsMedia<T extends { mediaUrl: string | null }>(
    steps: T[],
  ): Promise<T[]> {
    return Promise.all(steps.map((s) => this.resolveStepMedia(s)));
  }

  private routineInclude = {
    conditions: true,
    steps: { orderBy: { order: 'asc' as const } },
  };

  private async withResolvedSteps<
    T extends { steps: { mediaUrl: string | null }[] },
  >(routine: T): Promise<T> {
    return { ...routine, steps: await this.resolveStepsMedia(routine.steps) };
  }

  // ─── Rutinas ────────────────────────────────────────────────────────────────

  async getRoutines(userId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    const routines = await this.prisma.routine.findMany({
      where: { doctorId: doctorId },
      include: this.routineInclude,
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(routines.map((r) => this.withResolvedSteps(r)));
  }

  async getRoutine(userId: string, routineId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRoutineOwner(BigInt(routineId), doctorId);
    const routine = await this.prisma.routine.findUniqueOrThrow({
      where: { id: BigInt(routineId) },
      include: this.routineInclude,
    });
    return this.withResolvedSteps(routine);
  }

  async createRoutine(userId: string, dto: CreateRoutineDto) {
    const doctorId = await this.catalogDoctorId(userId);
    const routine = await this.prisma.routine.create({
      data: {
        doctorId: doctorId,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
        conditions: dto.conditions?.length
          ? {
              create: dto.conditions.map((c) => ({
                metricType: c.metricType,
                region: c.region,
                operator: c.operator,
                value: c.value,
                textValue: c.textValue,
              })),
            }
          : undefined,
      },
      include: this.routineInclude,
    });
    return this.withResolvedSteps(routine);
  }

  async updateRoutine(
    userId: string,
    routineId: string,
    dto: UpdateRoutineDto,
  ) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRoutineOwner(BigInt(routineId), doctorId);

    await this.prisma.$transaction(async (tx) => {
      await tx.routine.update({
        where: { id: BigInt(routineId) },
        data: {
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive,
        },
      });
      // Reemplazo completo de condiciones si vienen en el payload — igual
      // que hace el DTO, más simple que CRUD granular por condición.
      if (dto.conditions !== undefined) {
        await tx.routineCondition.deleteMany({
          where: { routineId: BigInt(routineId) },
        });
        if (dto.conditions.length > 0) {
          await tx.routineCondition.createMany({
            data: dto.conditions.map((c) => ({
              routineId: BigInt(routineId),
              metricType: c.metricType,
              region: c.region,
              operator: c.operator,
              value: c.value,
              textValue: c.textValue,
            })),
          });
        }
      }
    });

    const routine = await this.prisma.routine.findUniqueOrThrow({
      where: { id: BigInt(routineId) },
      include: this.routineInclude,
    });
    return this.withResolvedSteps(routine);
  }

  async deleteRoutine(userId: string, routineId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRoutineOwner(BigInt(routineId), doctorId);
    return this.prisma.routine.delete({ where: { id: BigInt(routineId) } });
  }

  // ─── Pasos ──────────────────────────────────────────────────────────────────

  async createStep(
    userId: string,
    routineId: string,
    dto: CreateRoutineStepDto,
  ) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRoutineOwner(BigInt(routineId), doctorId);
    if (dto.productId !== undefined) {
      await this.ensureProductOwner(BigInt(dto.productId), doctorId);
    }
    const step = await this.prisma.routineStep.create({
      data: {
        routineId: BigInt(routineId),
        order: dto.order,
        title: dto.title,
        description: dto.description,
        productId:
          dto.productId !== undefined ? BigInt(dto.productId) : undefined,
      },
    });
    return this.resolveStepMedia(step);
  }

  async updateStep(
    userId: string,
    routineId: string,
    stepId: string,
    dto: UpdateRoutineStepDto,
  ) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRoutineOwner(BigInt(routineId), doctorId);
    const step = await this.ensureStepOwner(BigInt(stepId), doctorId);
    if (step.routineId !== BigInt(routineId)) {
      throw new NotFoundException('Paso no encontrado en esta rutina');
    }
    if (dto.productId !== undefined) {
      await this.ensureProductOwner(BigInt(dto.productId), doctorId);
    }
    const updated = await this.prisma.routineStep.update({
      where: { id: BigInt(stepId) },
      data: {
        order: dto.order,
        title: dto.title,
        description: dto.description,
        productId:
          dto.productId !== undefined ? BigInt(dto.productId) : undefined,
      },
    });
    return this.resolveStepMedia(updated);
  }

  async deleteStep(userId: string, routineId: string, stepId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRoutineOwner(BigInt(routineId), doctorId);
    const step = await this.ensureStepOwner(BigInt(stepId), doctorId);
    if (step.routineId !== BigInt(routineId)) {
      throw new NotFoundException('Paso no encontrado en esta rutina');
    }
    return this.prisma.routineStep.delete({ where: { id: BigInt(stepId) } });
  }

  private async ensureProductOwner(productId: bigint, doctorId: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (product.doctorId !== doctorId) {
      throw new ForbiddenException('No tienes acceso a este producto');
    }
    return product;
  }

  private static readonly ALLOWED_MEDIA_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
  ];
  private static readonly MAX_MEDIA_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

  async uploadStepMedia(
    userId: string,
    routineId: string,
    stepId: string,
    file: Express.Multer.File,
  ) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRoutineOwner(BigInt(routineId), doctorId);
    const step = await this.ensureStepOwner(BigInt(stepId), doctorId);
    if (step.routineId !== BigInt(routineId)) {
      throw new NotFoundException('Paso no encontrado en esta rutina');
    }

    if (!RoutinesService.ALLOWED_MEDIA_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Formato no soportado (${file.mimetype}). Usa imagen (jpg/png/webp/gif) o video (mp4/webm).`,
      );
    }
    if (file.size > RoutinesService.MAX_MEDIA_SIZE_BYTES) {
      throw new BadRequestException(
        'El archivo supera el tamaño máximo (25MB).',
      );
    }

    const mediaType = file.mimetype.startsWith('video/')
      ? 'video'
      : file.mimetype === 'image/gif'
        ? 'gif'
        : 'image';
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `routines/${routineId}/steps/${stepId}/media.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);

    const updated = await this.prisma.routineStep.update({
      where: { id: BigInt(stepId) },
      data: { mediaUrl: key, mediaType },
    });
    return this.resolveStepMedia(updated);
  }

  // ─── Motor de recomendación ─────────────────────────────────────────────────

  /** Rutinas activas del doctor cuyas condiciones (lógica O — basta con que
   * una se cumpla) matchean los resultados estructurados de un análisis
   * YouCam (analysis_results). Solo aplica a análisis YouCam. */
  async getRecommendedRoutines(userId: string, analysisId: string) {
    const { results } =
      await this.analysisConditions.loadAnalysisResultsForDoctor(
        userId,
        analysisId,
      );
    if (results.length === 0) return [];

    const doctorId = await this.catalogDoctorId(userId);

    const routines = await this.prisma.routine.findMany({
      where: { doctorId, isActive: true },
      include: this.routineInclude,
    });

    const matched = routines.filter((routine) =>
      this.analysisConditions.matchesAnyCondition(routine.conditions, results),
    );

    return Promise.all(matched.map((r) => this.withResolvedSteps(r)));
  }
}
