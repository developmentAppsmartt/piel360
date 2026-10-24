import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import {
  computeSkinAgeSnapshot,
  readAnalisisPiel360SkinAgeYears,
} from '../youcam/skin-age-snapshot.util';
import type { SimulateSkinAgeRuleDto } from './dto/skin-age-rule.dto';
import { SkinAgeRuleCatalogService } from './skin-age-rule-catalog.service';
import { SkinAgeRulesService } from './skin-age-rules.service';
import {
  buildSimulationSnapshot,
  pickBestMatchingRule,
  serializeSkinAgeRule,
  skinAgeRuleContext,
} from './skin-age-rules.util';

/** Elige la regla de edad de piel que aplica (diferencia de edad + biotipo +
 * fototipo) y devuelve lo que recomienda: análisis del doctor, consejos del
 * paciente y simulador. */
@Injectable()
export class SkinAgeRecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
    private readonly rules: SkinAgeRulesService,
    private readonly catalog: SkinAgeRuleCatalogService,
  ) {}

  async simulate(userId: string, dto: SimulateSkinAgeRuleDto) {
    const doctorId = await this.rules.catalogDoctorId(userId);
    const snapshot = buildSimulationSnapshot(dto.birthDate, dto.skinAgeYears);
    if (snapshot.skinAgeDifference == null) {
      throw new BadRequestException(
        'No se pudo calcular la diferencia de edad',
      );
    }

    const rules = await this.rules.listRules(userId);
    const context = {
      skinType: dto.skinType ?? null,
      fitzpatrickScale: dto.fitzpatrickScale ?? null,
    };
    const matched = pickBestMatchingRule(
      rules,
      snapshot.skinAgeDifference,
      context,
    );
    if (!matched) {
      return {
        snapshot: { ...snapshot, ...context },
        matchedRule: null,
        recommendations: {
          routines: [],
          treatments: [],
          products: [],
          supplements: [],
        },
      };
    }

    const recommendations = await this.catalog.loadRecommendations(
      doctorId,
      matched,
    );
    return {
      snapshot: { ...snapshot, ...context },
      matchedRule: matched,
      recommendations,
    };
  }

  async recommendForAnalysis(userId: string, analysisId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(analysisId) },
      include: { patient: true },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');

    const allowed = await this.orgContext.canAccessPatientDoctorId(
      userId,
      analysis.patient.doctorId,
    );
    if (!allowed) {
      throw new ForbiddenException('No tienes acceso a este análisis');
    }

    if (!analysis.patient.doctorId) {
      return this.catalog.emptyRecommendations({
        skinAgeYears: null,
        chronologicalAgeYears: null,
        skinAgeDifference: null,
        message: 'El paciente no está vinculado a un profesional.',
      });
    }

    return this.buildCareRecommendations(
      await this.catalogDoctorIdFor(analysis.patient.doctorId),
      analysis.patient,
      analysis,
    );
  }

  /** Reglas y catálogo viven en el doctor dueño de la cuenta. Con el doctor del
   * paciente a secas, los pacientes de un profesional de equipo no veían
   * ninguna regla de la empresa ni su catálogo. */
  private async catalogDoctorIdFor(patientDoctorId: bigint): Promise<bigint> {
    const linkedDoctor = await this.prisma.doctor.findUnique({
      where: { id: patientDoctorId },
      select: { userId: true },
    });
    if (!linkedDoctor?.userId) return patientDoctorId;
    const ctx = await this.orgContext.resolve(linkedDoctor.userId.toString());
    return ctx.catalogDoctorId;
  }

  /**
   * Bundle para la UI de resultados (doctor o paciente con acceso al análisis):
   * regla de edad de piel + catálogo completo del médico del paciente.
   */
  async careRecommendationsForAnalysis(userId: string, analysisId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(analysisId) },
      include: { patient: true },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');

    const patientUserId = analysis.patient.userId?.toString();
    const isOwnerPatient = patientUserId === userId;
    const sharedOk = isOwnerPatient && analysis.sharedWithPatient;
    const doctorOk = await this.orgContext
      .canAccessPatientDoctorId(userId, analysis.patient.doctorId)
      .catch(() => false);

    // Superadmin / doctor del equipo / paciente solo si el análisis fue compartido.
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: { roles: true },
    });
    const isSuperadmin = user?.roles.some((r) => r.name === 'superadmin');
    if (!isSuperadmin && !doctorOk && !sharedOk) {
      throw new ForbiddenException('No tienes acceso a este análisis');
    }

    if (!analysis.patient.doctorId) {
      return {
        ...this.catalog.emptyRecommendations({
          skinAgeYears: null,
          chronologicalAgeYears: null,
          skinAgeDifference: null,
          message: 'El paciente no está vinculado a un profesional.',
        }),
        catalog: {
          routines: [],
          treatments: [],
          products: [],
          supplements: [],
        },
      };
    }

    const doctorId = await this.catalogDoctorIdFor(analysis.patient.doctorId);
    const matched = await this.buildCareRecommendations(
      doctorId,
      analysis.patient,
      analysis,
    );
    const catalog = await this.catalog.loadDoctorCatalog(doctorId);
    return { ...matched, catalog };
  }

  private async buildCareRecommendations(
    doctorId: bigint,
    patient: {
      birthDate: Date | null;
      fitzpatrickType: string | null;
      lastSkinAgeYears: number | null;
      lastChronologicalAgeYears: number | null;
      lastSkinAgeDifference: number | null;
    },
    analysis: {
      skinAgeYears: number | null;
      aiRawResponse: unknown;
      createdAt: Date;
    },
  ) {
    const skinAgeYears =
      analysis.skinAgeYears ??
      readAnalisisPiel360SkinAgeYears(analysis.aiRawResponse) ??
      patient.lastSkinAgeYears ??
      null;
    const snap = computeSkinAgeSnapshot({
      skinAgeYears,
      birthDate: patient.birthDate,
      analysisDate: analysis.createdAt,
    });
    const skinAgeDifference =
      snap.skinAgeDifference ?? patient.lastSkinAgeDifference ?? null;
    const context = skinAgeRuleContext(
      analysis.aiRawResponse,
      patient.fitzpatrickType,
    );
    const snapshot = {
      skinAgeYears: snap.skinAgeYears ?? patient.lastSkinAgeYears ?? null,
      chronologicalAgeYears:
        snap.chronologicalAgeYears ?? patient.lastChronologicalAgeYears ?? null,
      skinAgeDifference,
      ...context,
      message:
        skinAgeDifference == null
          ? 'Aún no hay edad de piel para aplicar reglas.'
          : null,
    };

    if (skinAgeDifference == null) {
      return this.catalog.emptyRecommendations(snapshot);
    }

    const rules = await this.prisma.skinAgeRule.findMany({
      where: { doctorId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const serialized = rules.map((rule) => serializeSkinAgeRule(rule));
    const matched = pickBestMatchingRule(
      serialized,
      skinAgeDifference,
      context,
    );
    if (!matched) {
      return this.catalog.emptyRecommendations({
        ...snapshot,
        message:
          'Ninguna regla coincide con la edad de piel, el biotipo y el fototipo del paciente.',
      });
    }

    const recommendations = await this.catalog.loadRecommendations(
      doctorId,
      matched,
    );
    return {
      snapshot,
      matchedRule: matched,
      recommendations,
    };
  }

  /**
   * Consejos para el paciente autenticado: usa el **último análisis compartido**
   * con edad de piel (YouCam). Si no hay, cae al snapshot del paciente.
   */
  async recommendForPatientUser(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: BigInt(userId) },
    });
    if (!patient) {
      throw new ForbiddenException('El usuario no tiene un perfil de paciente');
    }
    if (!patient.doctorId) {
      return this.catalog.emptyRecommendations({
        skinAgeYears: null,
        chronologicalAgeYears: null,
        skinAgeDifference: null,
        message: 'Este paciente aún no está vinculado a un profesional.',
      });
    }

    const rulesDoctorId = await this.catalogDoctorIdFor(patient.doctorId);

    // Preferir análisis compartidos (más reciente primero) hasta encontrar
    // uno con edad de piel. Evita que un fototipo/otro tipo posterior tape
    // el YouCam compartido.
    const sharedCandidates = await this.prisma.analysis.findMany({
      where: { patientId: patient.id, sharedWithPatient: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        skinAgeYears: true,
        chronologicalAgeYears: true,
        skinAgeDifference: true,
        aiRawResponse: true,
        analisisPiel360TaskId: true,
      },
    });

    let skinAgeYears: number | null = null;
    let chronologicalAgeYears: number | null = null;
    let skinAgeDifference: number | null = null;
    let context = skinAgeRuleContext(null, patient.fitzpatrickType);

    for (const candidate of sharedCandidates) {
      const fromColumn = candidate.skinAgeYears;
      const fromRaw = readAnalisisPiel360SkinAgeYears(candidate.aiRawResponse);
      const resolvedSkinAge = fromColumn ?? fromRaw;
      if (resolvedSkinAge == null) continue;

      const snap = computeSkinAgeSnapshot({
        skinAgeYears: resolvedSkinAge,
        birthDate: patient.birthDate,
        analysisDate: candidate.createdAt,
      });
      skinAgeYears = snap.skinAgeYears;
      chronologicalAgeYears =
        snap.chronologicalAgeYears ?? candidate.chronologicalAgeYears;
      skinAgeDifference = snap.skinAgeDifference ?? candidate.skinAgeDifference;
      context = skinAgeRuleContext(
        candidate.aiRawResponse,
        patient.fitzpatrickType,
      );
      break;
    }

    // Solo análisis compartidos alimentan consejos (no lastSkinAge* del CRM,
    // que se actualiza al completar antes de compartir).

    const snapshot = {
      skinAgeYears,
      chronologicalAgeYears,
      skinAgeDifference,
      ...context,
      message:
        skinAgeDifference == null
          ? sharedCandidates.length === 0
            ? 'Aún no tienes un análisis compartido por tu profesional.'
            : 'Aún no hay un análisis de edad de piel compartido para generar consejos.'
          : null,
    };

    if (skinAgeDifference == null) {
      return this.catalog.emptyRecommendations(snapshot);
    }

    const rules = await this.prisma.skinAgeRule.findMany({
      where: { doctorId: rulesDoctorId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const serialized = rules.map((rule) => serializeSkinAgeRule(rule));
    const matched = pickBestMatchingRule(
      serialized,
      skinAgeDifference,
      context,
    );
    if (!matched) {
      return this.catalog.emptyRecommendations({
        ...snapshot,
        message:
          'No hay una regla de edad de piel que coincida con tu diferencia actual.',
      });
    }

    const recommendations = await this.catalog.loadRecommendations(
      rulesDoctorId,
      matched,
    );
    return {
      snapshot,
      matchedRule: matched,
      recommendations,
    };
  }
}
