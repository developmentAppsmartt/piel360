import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { DOCTOR_PANEL_ROLES, type Role } from '@piel360/shared';
import { OrgContextService } from '../organizations/org-context.service';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { SkiniverService } from '../skiniver/skiniver.service';
import { StorageService } from '../storage/storage.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SpecialtyAccessService } from '../specialty-access/specialty-access.service';
import {
  getAnalysisProviderIdBySlug,
  parsePlanProviderIds,
} from '../plans/plan-providers.util';
import {
  patientLatestSkinAgeData,
  snapshotFromAnalysis,
  snapshotHasValues,
} from '../youcam/skin-age-persist.util';
import type { JwtPayload } from '../auth/types';
import { AnalysisImageUrlsService } from './analysis-image-urls.service';
import type { ConfirmAnalysisDto } from './dto/confirm-analysis.dto';
import type { CreateAnalysisDto } from './dto/create-analysis.dto';
import {
  ANALYSIS_IMAGES_QUEUE,
  ENCYCLOPEDIA_QUEUE,
  type AnalysisImagesJobData,
  type EncyclopediaJobData,
} from './queues';

const SKINIVER_PROVIDER_SLUG = 'skiniver';

function isDoctorPanelRole(role: Role): boolean {
  return (DOCTOR_PANEL_ROLES as readonly Role[]).includes(role);
}

@Injectable()
export class AnalysesService {
  private readonly logger = new Logger(AnalysesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skiniver: SkiniverService,
    private readonly subscriptions: SubscriptionsService,
    private readonly patients: PatientsService,
    private readonly orgContext: OrgContextService,
    private readonly doctors: DoctorsService,
    private readonly storage: StorageService,
    private readonly specialtyAccess: SpecialtyAccessService,
    private readonly imageUrls: AnalysisImageUrlsService,
    @InjectQueue(ANALYSIS_IMAGES_QUEUE)
    private readonly analysisImagesQueue: Queue<AnalysisImagesJobData>,
    @InjectQueue(ENCYCLOPEDIA_QUEUE)
    private readonly encyclopediaQueue: Queue<EncyclopediaJobData>,
  ) {}

  /** Flujo completo Skiniver — MIGRACION.md §4.1. */
  async performAnalysis(
    dto: CreateAnalysisDto,
    image: Buffer,
    currentUser: JwtPayload,
  ) {
    try {
      return await this.performAnalysisInner(dto, image, currentUser);
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ForbiddenException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error(
        `POST /analyses falló (patientId=${dto.patientId}): ${String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  private async performAnalysisInner(
    dto: CreateAnalysisDto,
    image: Buffer,
    currentUser: JwtPayload,
  ) {
    // Verifica que el usuario puede operar sobre este paciente (scoping).
    await this.patients.findOne(dto.patientId, currentUser);
    await this.orgContext.assertTeamPermissionForUser(currentUser.sub, 'analyses');

    const userId = BigInt(currentUser.sub);
    await this.specialtyAccess.assertCanUseProvider(userId, SKINIVER_PROVIDER_SLUG);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const subscription = await this.subscriptions.findActiveForUser(
      this.prisma,
      userId,
      SKINIVER_PROVIDER_SLUG,
    );
    if (!subscription) {
      throw new BadRequestException('No tienes una suscripción activa');
    }

    const remaining = await this.subscriptions.remainingCredits(
      this.prisma,
      subscription.id,
      subscription.plan.analysisLimit,
    );
    if (remaining <= 0) {
      throw new BadRequestException(
        'Has agotado los análisis disponibles de tu plan',
      );
    }

    const validation = await this.skiniver.validate(image);
    if (!validation.isgood) {
      throw new BadRequestException(
        `La imagen no es apta para análisis clínico (Score: ${validation.prob})`,
      );
    }

    const prediction = await this.skiniver.predict(
      image,
      user.diagnosticLanguage,
    );

    if (prediction.error) {
      throw new BadRequestException(
        `Skiniver rechazó la imagen: ${prediction.error}`,
      );
    }

    const analysis = await this.prisma.$transaction(async (tx) => {
      const skiniverProviderId = await getAnalysisProviderIdBySlug(
        tx,
        SKINIVER_PROVIDER_SLUG,
      );
      const remainingInTx = await this.subscriptions.remainingCredits(
        tx,
        subscription.id,
        subscription.plan.analysisLimit,
      );
      if (remainingInTx <= 0) {
        throw new BadRequestException(
          'Has agotado los análisis disponibles de tu plan',
        );
      }

      const created = await tx.analysis.create({
        data: {
          patientId: BigInt(dto.patientId),
          userId,
          providerId: skiniverProviderId,
          imagePath: `analyses/pending/original.jpg`,
          bodyRegion: dto.bodyRegion,
          xCoord: dto.xCoord,
          yCoord: dto.yCoord,
          zCoord: dto.zCoord,
          isValid: true,
          // La API real de Skiniver devuelve `prob` como string (ej. "91"),
          // aunque el tipo declarado sea number — confirmado en vivo, no es
          // un artefacto de mock. Normalizar antes de persistir (Prisma
          // rechaza un string en una columna Float).
          validationScore: Number(validation.prob),
          aiDiagnosis: prediction.class,
          aiProbability:
            Number(prediction.prob) > 1
              ? Number(prediction.prob) / 100
              : Number(prediction.prob),
          aiRawResponse: prediction as unknown as Prisma.InputJsonValue,
        },
      });

      await this.subscriptions.consumeCredit(tx, subscription.id, created.id);

      return created;
    });

    const originalKey = `analyses/${analysis.id}/original.jpg`;
    try {
      await this.storage.upload(originalKey, image, 'image/jpeg');
    } catch (error) {
      // No bloquear la creación (crédito ya consumido, predicción ya lista)
      // por una falla de storage — mismo criterio de tolerancia que
      // analysis-images.processor.ts para colored/masked.
      this.logger.warn(
        `No se pudo subir la foto original del análisis ${analysis.id}: ${String(error)}`,
      );
    }
    const updated = await this.prisma.analysis.update({
      where: { id: analysis.id },
      data: { imagePath: originalKey },
    });

    try {
      await this.analysisImagesQueue.add('download', {
        analysisId: analysis.id.toString(),
        coloredUrl: prediction.colored_s3_url,
        maskedUrl: prediction.masked_s3_url,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo encolar imágenes del análisis ${analysis.id}: ${String(error)}`,
      );
    }

    for (const candidate of prediction.topn ?? []) {
      if (candidate.atlas_page_link) {
        try {
          await this.encyclopediaQueue.add('process', {
            url: candidate.atlas_page_link,
          });
        } catch (error) {
          this.logger.warn(
            `No se pudo encolar encyclopedia ${candidate.atlas_page_link}: ${String(error)}`,
          );
        }
      }
    }

    return this.presentAnalysisResult(updated, currentUser);
  }

  /** Paciente no recibe payload clínico hasta que el profesional comparta. */
  private async presentAnalysisResult(
    analysis: {
      id: bigint;
      patientId: bigint;
      isValid: boolean;
      sharedWithPatient: boolean;
      imagePath: string;
      coloredS3Url?: string | null;
      maskedS3Url?: string | null;
      aiRawResponse?: unknown;
      [key: string]: unknown;
    },
    currentUser: JwtPayload,
  ) {
    if (
      currentUser.role === 'patient' &&
      !analysis.sharedWithPatient
    ) {
      return {
        id: analysis.id.toString(),
        patientId: analysis.patientId.toString(),
        isValid: analysis.isValid,
        sharedWithPatient: false,
        message:
          'Análisis enviado a tu profesional. Lo verás cuando lo valide y comparta.',
      };
    }
    return this.imageUrls.withImageUrls(analysis as never);
  }

  async findAll(currentUser: JwtPayload) {
    // `provider.displayLabel` — filas creadas antes de este campo (o sin
    // providerId poblado) no traen relación; el frontend cae al heurístico
    // por youcamTaskId como respaldo.
    const providerSelect = { select: { displayLabel: true } };

    if (currentUser.role === 'superadmin') {
      return this.prisma.analysis.findMany({
        include: { patient: true, provider: providerSelect },
        orderBy: { id: 'desc' },
      });
    }

    if (isDoctorPanelRole(currentUser.role)) {
      await this.orgContext.assertTeamPermissionForUser(
        currentUser.sub,
        'analyses',
      );
      const scope = await this.orgContext.resolvePatientDoctorScope(
        currentUser.sub,
      );
      return this.prisma.analysis.findMany({
        where: { patient: { doctorId: { in: scope.visibleDoctorIds } } },
        include: { patient: true, provider: providerSelect },
        orderBy: { id: 'desc' },
      });
    }

    // Paciente: solo análisis compartidos de su perfil (Patient.userId).
    // Nunca verá resultados solo por haber ejecutado la captura.
    return this.prisma.analysis.findMany({
      where: {
        sharedWithPatient: true,
        patient: { userId: BigInt(currentUser.sub) },
      },
      include: { patient: true, provider: providerSelect },
      orderBy: { id: 'desc' },
    });
  }

  /**
   * Estado liviano para el poll del flujo de captura.
   * El paciente ejecutor puede consultar si ya terminó, sin ver el resultado.
   */
  async getProcessingStatus(id: string, currentUser: JwtPayload) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(id) },
      include: {
        patient: { select: { doctorId: true, userId: true } },
      },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');

    const isExecutor = analysis.userId?.toString() === currentUser.sub;
    const isPatientOwner =
      analysis.patient.userId?.toString() === currentUser.sub;
    let doctorOk = false;
    if (currentUser.role === 'superadmin') {
      doctorOk = true;
    } else if (isDoctorPanelRole(currentUser.role)) {
      doctorOk = await this.orgContext.canAccessPatientDoctorId(
        currentUser.sub,
        analysis.patient.doctorId,
      );
    }
    if (!doctorOk && !isExecutor && !isPatientOwner) {
      throw new ForbiddenException('No puedes consultar este análisis');
    }

    const raw = analysis.aiRawResponse as
      | { error?: unknown; message?: string }
      | null;
    const error =
      raw && typeof raw === 'object' && raw.error
        ? String(raw.message || 'Error en el análisis')
        : null;

    return {
      id: analysis.id.toString(),
      isValid: analysis.isValid,
      hasColored: Boolean(analysis.coloredS3Url),
      hasMasked: Boolean(analysis.maskedS3Url),
      error,
    };
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(id) },
      include: { patient: true },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');
    await this.assertCanAccess(analysis, currentUser);
    const withSnapshot = await this.persistSkinAgeSnapshotIfMissing(analysis);
    return this.imageUrls.withImageUrls(withSnapshot);
  }

  async confirm(id: string, dto: ConfirmAnalysisDto, currentUser: JwtPayload) {
    const analysis = await this.findOne(id, currentUser);
    const finalDiagnosis = dto.finalDiagnosis ?? analysis.aiDiagnosis;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.analysis.update({
        where: { id: analysis.id },
        data: {
          isConfirmed: true,
          isCorrected: dto.isCorrected ?? false,
          finalDiagnosis,
          doctorNotes: dto.doctorNotes,
          confirmedById: BigInt(currentUser.sub),
          confirmedAt: new Date(),
        },
        include: { patient: true },
      });

      // Al confirmar Fitzpatrick, el fototipo pasa al perfil del paciente
      // (lo usa el chip "Tipo piel" de análisis YouCam posteriores).
      if (analysis.fitzpatrickTaskId) {
        const raw = analysis.aiRawResponse as {
          fitzpatrick_scale?: string;
        } | null;
        const scale =
          raw?.fitzpatrick_scale ??
          finalDiagnosis?.match(/\b(I{1,3}|IV|V|VI)\b/i)?.[1]?.toUpperCase();
        if (scale && ['I', 'II', 'III', 'IV', 'V', 'VI'].includes(scale)) {
          await tx.patient.update({
            where: { id: analysis.patientId },
            data: { fitzpatrickType: scale },
          });
        }
      }

      return row;
    });

    return this.imageUrls.withImageUrls(updated);
  }

  /**
   * Consumo de análisis (estético vs dermatológico): pools de créditos de
   * suscripciones activas + serie diaria y detalle del rango de fechas.
   */
  async getConsumption(
    currentUser: JwtPayload,
    query: { from?: string; to?: string } = {},
  ) {
    const { from, to } = resolveConsumptionRange(query.from, query.to);

    let analysisWhere: Prisma.AnalysisWhereInput = {
      createdAt: { gte: from, lte: to },
    };
    let subscriptionUserIds: bigint[] | null = null;

    if (currentUser.role === 'superadmin') {
      // Plataforma completa.
    } else if (isDoctorPanelRole(currentUser.role)) {
      await this.orgContext.assertTeamPermissionForUser(
        currentUser.sub,
        'billing',
      );
      const scope = await this.orgContext.resolvePatientDoctorScope(
        currentUser.sub,
      );
      analysisWhere = {
        ...analysisWhere,
        patient: { doctorId: { in: scope.visibleDoctorIds } },
      };
      subscriptionUserIds = [scope.ctx.subscriptionUserId];
    } else {
      throw new ForbiddenException(
        'No tienes permiso para consultar el consumo de análisis',
      );
    }

    const providers = await this.prisma.analysisProvider.findMany({
      select: { id: true, slug: true },
    });
    const slugById = new Map(providers.map((p) => [p.id.toString(), p.slug]));

    const [analyses, subscriptions] = await Promise.all([
      this.prisma.analysis.findMany({
        where: analysisWhere,
        select: {
          id: true,
          createdAt: true,
          patientId: true,
          youcamTaskId: true,
          fitzpatrickTaskId: true,
          provider: { select: { slug: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.subscription.findMany({
        where: {
          status: 'active',
          ...(subscriptionUserIds
            ? { userId: { in: subscriptionUserIds } }
            : {}),
        },
        include: {
          plan: true,
          usages: {
            select: {
              quantity: true,
              analysis: {
                select: {
                  youcamTaskId: true,
                  fitzpatrickTaskId: true,
                  provider: { select: { slug: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const aesthetic = emptyPool();
    const derm = emptyPool();

    for (const sub of subscriptions) {
      const buckets = planCreditBuckets(sub.plan, slugById);
      aesthetic.limit += buckets.aesthetic;
      derm.limit += buckets.derm;

      for (const usage of sub.usages) {
        const qty = usage.quantity ?? 1;
        if (isAestheticAnalysis(usage.analysis)) {
          aesthetic.done += qty;
        } else {
          derm.done += qty;
        }
      }
    }

    aesthetic.available = Math.max(0, aesthetic.limit - aesthetic.done);
    derm.available = Math.max(0, derm.limit - derm.done);

    const byDay = new Map<
      string,
      {
        aesthetic: number;
        derm: number;
        patients: Set<string>;
        pros: Map<string, number>;
      }
    >();

    for (const row of analyses) {
      const key = dayKey(row.createdAt);
      let bucket = byDay.get(key);
      if (!bucket) {
        bucket = {
          aesthetic: 0,
          derm: 0,
          patients: new Set(),
          pros: new Map(),
        };
        byDay.set(key, bucket);
      }
      if (isAestheticAnalysis(row)) bucket.aesthetic += 1;
      else bucket.derm += 1;
      bucket.patients.add(row.patientId.toString());
      const pro = row.user?.name?.trim() || 'Sin asignar';
      bucket.pros.set(pro, (bucket.pros.get(pro) ?? 0) + 1);
    }

    const sortedKeys = [...byDay.keys()].sort();
    const daily = sortedKeys.map((key) => {
      const b = byDay.get(key)!;
      return {
        date: formatDayShort(key),
        aesthetic: b.aesthetic,
        derm: b.derm,
      };
    });

    const rows = [...sortedKeys].reverse().map((key) => {
      const b = byDay.get(key)!;
      return {
        date: formatDayLong(key),
        aesthetic: b.aesthetic,
        derm: b.derm,
        total: b.aesthetic + b.derm,
        patients: b.patients.size,
        professional: topProfessional(b.pros),
      };
    });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      aesthetic,
      derm,
      daily,
      rows,
    };
  }

  /**
   * Doctor/admin publica el análisis al paciente vinculado
   * (`Patient.userId`). Sin ese vínculo el paciente no podrá listarlo.
   */
  async shareWithPatient(id: string, currentUser: JwtPayload) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(id) },
      include: { patient: true },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');
    await this.assertCanAccess(analysis, currentUser);

    if (!analysis.patient.userId) {
      throw new BadRequestException(
        'Este paciente aún no tiene cuenta en la app. Debe registrarse o vincularse antes de compartir el análisis.',
      );
    }

    if (analysis.sharedWithPatient) {
      return this.imageUrls.withImageUrls(analysis);
    }

    const updated = await this.prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        sharedWithPatient: true,
        sharedAt: new Date(),
      },
      include: { patient: true },
    });
    return this.imageUrls.withImageUrls(updated);
  }

  /**
   * Doctor/admin deja de publicar el análisis al paciente.
   * El paciente deja de verlo en su historial y consejos.
   */
  async unshareWithPatient(id: string, currentUser: JwtPayload) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(id) },
      include: { patient: true },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');
    await this.assertCanAccess(analysis, currentUser);

    if (!analysis.sharedWithPatient) {
      return this.imageUrls.withImageUrls(analysis);
    }

    const updated = await this.prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        sharedWithPatient: false,
        sharedAt: null,
      },
      include: { patient: true },
    });
    return this.imageUrls.withImageUrls(updated);
  }

  /** Rellena el snapshot en análisis YouCam antiguos que aún no lo tienen. */
  private async persistSkinAgeSnapshotIfMissing<
    T extends {
      id: bigint;
      patientId: bigint;
      youcamTaskId: string | null;
      isValid: boolean;
      aiRawResponse: Prisma.JsonValue | null;
      createdAt: Date;
      skinAgeYears: number | null;
      chronologicalAgeYears: number | null;
      skinAgeDifference: number | null;
      patient: {
        birthDate: Date | null;
        lastSkinAgeAt: Date | null;
      };
    },
  >(analysis: T): Promise<T> {
    if (!analysis.youcamTaskId || !analysis.isValid) return analysis;
    if (
      analysis.skinAgeYears != null &&
      analysis.chronologicalAgeYears != null &&
      analysis.skinAgeDifference != null
    ) {
      return analysis;
    }

    const snap = snapshotFromAnalysis({
      aiRawResponse: analysis.aiRawResponse,
      birthDate: analysis.patient.birthDate,
      analysisDate: analysis.createdAt,
    });
    if (!snapshotHasValues(snap)) return analysis;

    const patientSkinAge = patientLatestSkinAgeData(
      analysis.patient,
      analysis.createdAt,
      snap,
    );

    const updated = await this.prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        skinAgeYears: snap.skinAgeYears,
        chronologicalAgeYears: snap.chronologicalAgeYears,
        skinAgeDifference: snap.skinAgeDifference,
      },
      include: { patient: true },
    });
    if (patientSkinAge) {
      await this.prisma.patient.update({
        where: { id: analysis.patientId },
        data: patientSkinAge,
      });
    }
    return updated as unknown as T;
  }

  private async assertCanAccess(
    analysis: {
      userId: bigint | null;
      sharedWithPatient: boolean;
      patient: { doctorId: bigint | null; userId: bigint | null };
    },
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === 'superadmin') return;

    if (isDoctorPanelRole(currentUser.role)) {
      const allowed = await this.orgContext.canAccessPatientDoctorId(
        currentUser.sub,
        analysis.patient.doctorId,
      );
      if (allowed) return;
      throw new ForbiddenException('Este análisis no pertenece a tu consulta');
    }

    // Paciente: solo si el análisis fue compartido y pertenece a su perfil.
    // Haber ejecutado la captura (userId) NO otorga ver el resultado:
    // el profesional debe validar y compartir.
    if (
      analysis.sharedWithPatient &&
      analysis.patient.userId?.toString() === currentUser.sub
    ) {
      return;
    }

    throw new ForbiddenException('No puedes acceder a este análisis');
  }
}

const AESTHETIC_PROVIDER_SLUGS = new Set(['youcam', 'fitzpatrick']);

function emptyPool() {
  return { done: 0, limit: 0, available: 0 };
}

function isAestheticAnalysis(row: {
  youcamTaskId?: string | null;
  fitzpatrickTaskId?: string | null;
  provider?: { slug: string } | null;
}): boolean {
  if (row.youcamTaskId || row.fitzpatrickTaskId) return true;
  const slug = row.provider?.slug;
  return slug != null && AESTHETIC_PROVIDER_SLUGS.has(slug);
}

function planCreditBuckets(
  plan: {
    analysisLimit: number;
    analysisLimits: Prisma.JsonValue;
    analysisProviderIds: Prisma.JsonValue;
    analysisProviderId: bigint;
  },
  slugById: Map<string, string>,
): { aesthetic: number; derm: number } {
  const raw = plan.analysisLimits;
  const limits =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as { skiniver?: number; aesthetic?: number })
      : {};

  const hasSplit =
    typeof limits.skiniver === 'number' || typeof limits.aesthetic === 'number';
  if (hasSplit) {
    return {
      aesthetic: Math.max(0, limits.aesthetic ?? 0),
      derm: Math.max(0, limits.skiniver ?? 0),
    };
  }

  const ids = parsePlanProviderIds(plan);
  const slugs = ids
    .map((id) => slugById.get(id))
    .filter((s): s is string => Boolean(s));
  const hasSkiniver = slugs.includes('skiniver');
  const hasAesthetic = slugs.some((s) => AESTHETIC_PROVIDER_SLUGS.has(s));
  const limit = Math.max(0, plan.analysisLimit);

  if (hasSkiniver && !hasAesthetic) return { aesthetic: 0, derm: limit };
  if (hasAesthetic && !hasSkiniver) return { aesthetic: limit, derm: 0 };
  if (hasAesthetic) return { aesthetic: limit, derm: 0 };
  return { aesthetic: 0, derm: limit };
}

function resolveConsumptionRange(fromRaw?: string, toRaw?: string) {
  const now = new Date();
  let from: Date;
  let to: Date;

  if (fromRaw && toRaw) {
    from = startOfDay(parseIsoDate(fromRaw));
    to = endOfDay(parseIsoDate(toRaw));
  } else if (fromRaw) {
    from = startOfDay(parseIsoDate(fromRaw));
    to = endOfDay(from);
  } else {
    // Mes calendario actual (UTC local del servidor).
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    to = endOfDay(now);
  }

  if (from.getTime() > to.getTime()) {
    throw new BadRequestException(
      'El rango de fechas es inválido (from > to)',
    );
  }
  return { from, to };
}

function parseIsoDate(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Fecha inválida: ${value}`);
  }
  return d;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Clave estable YYYY-MM-DD en zona local del servidor. */
function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayShort(key: string) {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}

function formatDayLong(key: string) {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

function topProfessional(counts: Map<string, number>) {
  let best = 'Sin asignar';
  let bestN = -1;
  for (const [name, n] of counts) {
    if (n > bestN) {
      best = name;
      bestN = n;
    }
  }
  return best;
}
