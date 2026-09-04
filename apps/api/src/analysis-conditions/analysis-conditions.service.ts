import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AnalysisResult } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';

interface Condition {
  metricType: string;
  region: string | null;
  operator: string;
  /** Numérica — null cuando la condición es categórica (ver textValue).
   * Con operator "between" es el límite inferior (ver valueTo). */
  value: number | null;
  /** Límite superior — solo cuando operator es "between". */
  valueTo?: number | null;
  /** Categórica — solo `hd_skin_type`. */
  textValue?: string | null;
}

/** "lt" | "lte" | "eq" | "gte" | "gt" | "between" (ver dto/condition.dto.ts).
 * "between" es genérico — sirve para cualquier métrica numérica (rango
 * acotado, ej. "edad entre 13 y 18"), ambos límites inclusive. */
export function operatorMatches(
  operator: string,
  score: number,
  value: number,
  valueTo?: number | null,
): boolean {
  switch (operator) {
    case 'lt':
      return score < value;
    case 'lte':
      return score <= value;
    case 'eq':
      return score === value;
    case 'gte':
      return score >= value;
    case 'gt':
      return score > value;
    case 'between':
      return valueTo != null && score >= value && score <= valueTo;
    default:
      return false;
  }
}

/** Puntaje simplificado — mismo criterio de respaldo usado en toda la UI. */
export function resolveScore(result: AnalysisResult): number | null {
  return result.uiScore ?? result.score ?? result.rawScore;
}

/** Edad exacta en años completos a una fecha dada (ajusta por mes/día, no
 * solo resta de años). */
function ageInYears(birthDate: Date, atDate: Date): number {
  let age = atDate.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    atDate.getMonth() > birthDate.getMonth() ||
    (atDate.getMonth() === birthDate.getMonth() &&
      atDate.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export interface SkinAgeContext {
  patientBirthDate: Date | null;
  analysisDate: Date;
}

/** El formulario de condiciones no pide región (se mantiene simple para
 * personal sin experiencia técnica) — el doctor piensa en "Arrugas", no en
 * "Arrugas (frente)". Métricas con varias zonas (hd_wrinkle, hd_pore,
 * hd_skin_type, hd_acne, hd_texture) guardan su puntaje general bajo
 * region: "whole", no region: null. Mismo criterio que
 * apps/web/src/lib/youcam-metrics.ts#youcamScoresByType: sin región
 * explícita en la condición, "whole" y null son el mismo "puntaje general". */
function findResultForCondition(
  results: AnalysisResult[],
  condition: Condition,
): AnalysisResult | undefined {
  const candidates = results.filter((r) => r.type === condition.metricType);
  if (condition.region) {
    return candidates.find((r) => r.region === condition.region);
  }
  return (
    candidates.find((r) => r.region === 'whole') ??
    candidates.find((r) => r.region === null) ??
    candidates[0]
  );
}

/** Motor de matching compartido entre Rutinas y Tratamientos — condiciones
 * combinadas con lógica O (basta con que una se cumpla). Solo aplica a
 * análisis YouCam (analysis_results solo se llena para ese proveedor). */
@Injectable()
export class AnalysisConditionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
  ) {}

  matchesAnyCondition<C extends Condition>(
    conditions: C[],
    results: AnalysisResult[],
    skinAge: SkinAgeContext,
  ): boolean {
    return conditions.some((condition) => {
      // hd_skin_type es categórico ("oily", "dry"...) — igualdad de texto,
      // no tiene sentido "mayor/menor que" un tipo de piel.
      if (condition.metricType === 'hd_skin_type') {
        const result = findResultForCondition(results, condition);
        if (!result || !condition.textValue || !result.skinType) return false;
        return (
          result.skinType.toLowerCase() === condition.textValue.toLowerCase()
        );
      }

      // patient_age es la edad cronológica real del paciente — no viene de
      // ningún AnalysisResult de YouCam, se calcula directo de
      // Patient.birthDate. Con operator "between" (límite genérico, no
      // solo para edad) se pueden armar rangos acotados como "13 a 18".
      let score: number | null;
      if (condition.metricType === 'patient_age') {
        if (!skinAge.patientBirthDate) return false;
        score = ageInYears(skinAge.patientBirthDate, skinAge.analysisDate);
      } else if (condition.metricType === 'skin_age') {
        // skin_age no se compara contra el puntaje crudo — el valor
        // clínicamente relevante es cuánto más vieja/joven se ve la piel
        // respecto a la edad real del paciente: edadPiel - edadCronológica.
        // Negativo = piel más joven; positivo = piel más vieja.
        if (!skinAge.patientBirthDate) return false;
        const result = findResultForCondition(results, condition);
        const skinAgeScore = result && resolveScore(result);
        if (skinAgeScore == null) return false;
        score =
          skinAgeScore -
          ageInYears(skinAge.patientBirthDate, skinAge.analysisDate);
      } else {
        const result = findResultForCondition(results, condition);
        if (!result) return false;
        score = resolveScore(result);
      }

      if (score == null || condition.value == null) return false;
      return operatorMatches(
        condition.operator,
        score,
        condition.value,
        condition.valueTo,
      );
    });
  }

  /** Verifica que el análisis pertenezca a un paciente del doctor autenticado
   * y devuelve sus AnalysisResult ya cargados. */
  async loadAnalysisResultsForDoctor(userId: string, analysisId: string) {
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

    const doctor = analysis.patient.doctorId
      ? await this.prisma.doctor.findUnique({
          where: { id: analysis.patient.doctorId },
        })
      : null;
    if (!doctor) {
      throw new NotFoundException('Médico del análisis no encontrado');
    }

    const results = await this.prisma.analysisResult.findMany({
      where: { analysisId: BigInt(analysisId) },
    });

    return {
      doctor,
      results,
      patientBirthDate: analysis.patient.birthDate,
      analysisDate: analysis.createdAt,
    };
  }
}
