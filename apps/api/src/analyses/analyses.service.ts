import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { DOCTOR_PANEL_ROLES, type Role } from '@piel360/shared';
import { OrgContextService } from '../organizations/org-context.service';
import { DoctorsService } from '../doctors/doctors.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportPdfService } from '../reports/report-pdf.service';
import { AnalisisDermaPiel360Service } from '../skiniver/skiniver.service';
import { StorageService } from '../storage/storage.service';
import { SubscriptionCreditsService } from '../subscriptions/subscription-credits.service';
import { SpecialtyAccessService } from '../specialty-access/specialty-access.service';
import { getAnalysisProviderIdBySlug } from '../plans/plan-providers.util';
import {
  patientLatestSkinAgeData,
  snapshotFromAnalysis,
  snapshotHasValues,
} from '../youcam/skin-age-persist.util';
import type { JwtPayload } from '../auth/types';
import {
  AnalysisImageUrlsService,
  imagePathPublico,
  sinUrlsDelProveedor,
} from './analysis-image-urls.service';
import { isAestheticAnalysis } from './analysis-credit-buckets';
import type { ConfirmAnalysisDto } from './dto/confirm-analysis.dto';
import type { CreateAnalysisDto } from './dto/create-analysis.dto';
import { resolverDiagnosticoFinal } from './final-diagnosis';
import {
  ANALYSIS_IMAGES_QUEUE,
  ENCYCLOPEDIA_QUEUE,
  type AnalysisImagesJobData,
  type EncyclopediaJobData,
} from './queues';

const SKINIVER_PROVIDER_SLUG = 'skiniver';

export function isDoctorPanelRole(role: Role): boolean {
  return (DOCTOR_PANEL_ROLES as readonly Role[]).includes(role);
}

@Injectable()
export class AnalysesService {
  private readonly logger = new Logger(AnalysesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skiniver: AnalisisDermaPiel360Service,
    private readonly subscriptions: SubscriptionCreditsService,
    private readonly patients: PatientsService,
    private readonly orgContext: OrgContextService,
    private readonly doctors: DoctorsService,
    private readonly storage: StorageService,
    private readonly specialtyAccess: SpecialtyAccessService,
    private readonly imageUrls: AnalysisImageUrlsService,
    private readonly notifications: NotificationsService,
    private readonly reportPdf: ReportPdfService,
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

    if (isDoctorPanelRole(currentUser.role)) {
      await this.orgContext.assertTeamPermissionForUser(
        currentUser.sub,
        'analyses',
      );
    }

    const userId = BigInt(currentUser.sub);
    await this.specialtyAccess.assertCanUseProvider(
      userId,
      SKINIVER_PROVIDER_SLUG,
      { patientId: dto.patientId },
    );
    const billingUserId =
      await this.subscriptions.resolveBillingUserIdForAnalysis(
        userId,
        dto.patientId,
      );
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const subscription = await this.subscriptions.findActiveForUser(
      this.prisma,
      billingUserId,
      SKINIVER_PROVIDER_SLUG,
    );
    if (!subscription) {
      throw new BadRequestException(
        'Suscripción no disponible. Análisis Dermatológico Piel 360',
      );
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
        `El análisis dermatológico rechazó la imagen: ${prediction.error}`,
      );
    }

    const analysis = await this.prisma.$transaction(async (tx) => {
      const analisisDermaPiel360ProviderId = await getAnalysisProviderIdBySlug(
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
          providerId: analisisDermaPiel360ProviderId,
          imagePath: `analyses/pending/original.jpg`,
          bodyRegion: dto.bodyRegion,
          xCoord: dto.xCoord,
          yCoord: dto.yCoord,
          zCoord: dto.zCoord,
          doctorNotes: dto.doctorNotes?.trim() || null,
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
    // por analisisPiel360TaskId como respaldo.
    const providerSelect = { select: { displayLabel: true } };

    // El listado devuelve la fila cruda, y `aiRawResponse` trae las URLs del
    // CDN del proveedor. A diferencia del detalle, aquí no pasa por
    // `withImageUrls`, que es donde se sanean.
    const sinUrls = <
      T extends { aiRawResponse: Prisma.JsonValue | null; imagePath: string },
    >(
      rows: T[],
    ): T[] =>
      rows.map((row) => ({
        ...row,
        imagePath: imagePathPublico(row.imagePath),
        aiRawResponse: sinUrlsDelProveedor(row.aiRawResponse),
      }));

    if (currentUser.role === 'superadmin') {
      return sinUrls(
        await this.prisma.analysis.findMany({
          include: { patient: true, provider: providerSelect },
          orderBy: { id: 'desc' },
        }),
      );
    }

    if (isDoctorPanelRole(currentUser.role)) {
      await this.orgContext.assertTeamPermissionForUser(
        currentUser.sub,
        'analyses',
      );
      const scope = await this.orgContext.resolvePatientDoctorScope(
        currentUser.sub,
      );
      return sinUrls(
        await this.prisma.analysis.findMany({
          where: { patient: { doctorId: { in: scope.visibleDoctorIds } } },
          include: { patient: true, provider: providerSelect },
          orderBy: { id: 'desc' },
        }),
      );
    }

    // Paciente: solo análisis compartidos de su perfil (Patient.userId).
    // Nunca verá resultados solo por haber ejecutado la captura.
    return sinUrls(
      await this.prisma.analysis.findMany({
        where: {
          sharedWithPatient: true,
          patient: { userId: BigInt(currentUser.sub) },
        },
        include: { patient: true, provider: providerSelect },
        orderBy: { id: 'desc' },
      }),
    );
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

  /** URL pública y permanente del PDF "Reporte Salud de la Piel" — genera el
   * PDF la primera vez (`ReportPdfService.ensureReportUrl`, ya usado por el
   * correo de "reporte listo") y reutiliza el mismo token en llamadas
   * posteriores. Solo aplica a análisis YouCam (el PDF asume esas métricas). */
  async getReportUrl(id: string, currentUser: JwtPayload) {
    const analysis = await this.findOne(id, currentUser);
    if (!analysis.analisisPiel360TaskId) {
      throw new BadRequestException(
        'El reporte en PDF solo está disponible para análisis YouCam.',
      );
    }
    const url = await this.reportPdf.ensureReportUrl(BigInt(analysis.id));
    if (!url) {
      // 503 y no 400: la peticion era valida, lo que fallo fue generar el PDF
      // en el servidor. La causa concreta queda en el log de ReportPdfService.
      throw new ServiceUnavailableException(
        'No se pudo generar el PDF del reporte. Inténtalo de nuevo en unos minutos; si el problema sigue, avisa a soporte.',
      );
    }
    return { url };
  }

  async confirm(id: string, dto: ConfirmAnalysisDto, currentUser: JwtPayload) {
    const analysis = await this.findOne(id, currentUser);
    const finalDiagnosis = dto.finalDiagnosis ?? analysis.aiDiagnosis;
    const esDermatologico =
      !analysis.analisisPiel360TaskId && !analysis.fitzpatrickTaskId;
    const clase = esDermatologico
      ? resolverDiagnosticoFinal(
          analysis.aiRawResponse,
          dto.finalDiagnosis,
          dto.finalDiagnosisCode,
        )
      : null;
    // El PDF del reporte se genera una sola vez y se cachea (ensureReportUrl
    // devuelve el guardado mientras existan token y key). Como las
    // observaciones salen en el PDF, si cambian hay que tirar el archivo para
    // que se regenere; el token se conserva para no romper el enlace
    // permanente que ya se envió por correo.
    // `undefined` = el cliente no mandó el campo, así que Prisma lo deja igual.
    const notesChanged =
      dto.doctorNotes !== undefined && dto.doctorNotes !== analysis.doctorNotes;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.analysis.update({
        where: { id: analysis.id },
        data: {
          isConfirmed: true,
          isCorrected: dto.isCorrected ?? false,
          finalDiagnosis,
          finalDiagnosisCode: clase?.code ?? null,
          finalDiagnosisCategory: clase?.category ?? null,
          doctorNotes: dto.doctorNotes,
          confirmedById: BigInt(currentUser.sub),
          confirmedAt: new Date(),
          ...(notesChanged ? { reportPdfKey: null } : {}),
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
   * Doctor/admin publica el análisis al paciente vinculado
   * (`Patient.userId`). Sin ese vínculo el paciente no podrá listarlo.
   */
  async shareWithPatient(id: string, currentUser: JwtPayload) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(id) },
      include: {
        patient: true,
        provider: { select: { slug: true, displayLabel: true } },
      },
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
      include: {
        patient: true,
        provider: { select: { slug: true, displayLabel: true } },
      },
    });

    const kind = isAestheticAnalysis(updated)
      ? 'estético'
      : 'dermatológico';
    const label =
      updated.provider?.displayLabel?.trim() ||
      `Diagnóstico ${kind}`;

    const patientUserId = updated.patient.userId;
    if (patientUserId != null) {
      void this.notifications
        .create({
          userId: patientUserId,
          type: 'analysis_shared',
          title: 'Nuevo diagnóstico compartido',
          body: `Tu médico compartió un diagnóstico ${kind}: ${label}. Ábrelo en tu historial.`,
          data: {
            analysisId: updated.id.toString(),
            patientId: updated.patientId.toString(),
            kind,
          },
        })
        .catch(() => undefined);
    }

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
      analisisPiel360TaskId: string | null;
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
    if (!analysis.analisisPiel360TaskId || !analysis.isValid) return analysis;
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
