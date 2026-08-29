import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AnalysisResult } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DoctorsService } from '../doctors/doctors.service';

interface Condition {
  metricType: string;
  region: string | null;
  operator: string;
  /** Numérica — null cuando la condición es categórica (ver textValue). */
  value: number | null;
  /** Categórica — solo `hd_skin_type`. */
  textValue?: string | null;
}

/** "lt" | "lte" | "eq" | "gte" | "gt" (ver dto/condition.dto.ts). */
export function operatorMatches(
  operator: string,
  score: number,
  value: number,
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
    default:
      return false;
  }
}

/** Puntaje simplificado — mismo criterio de respaldo usado en toda la UI. */
export function resolveScore(result: AnalysisResult): number | null {
  return result.uiScore ?? result.score ?? result.rawScore;
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
    private readonly doctorsService: DoctorsService,
  ) {}

  matchesAnyCondition<C extends Condition>(
    conditions: C[],
    results: AnalysisResult[],
  ): boolean {
    return conditions.some((condition) => {
      const result = findResultForCondition(results, condition);
      if (!result) return false;

      // hd_skin_type es categórico ("oily", "dry"...) — igualdad de texto,
      // no tiene sentido "mayor/menor que" un tipo de piel.
      if (condition.metricType === 'hd_skin_type') {
        if (!condition.textValue || !result.skinType) return false;
        return (
          result.skinType.toLowerCase() === condition.textValue.toLowerCase()
        );
      }

      const score = resolveScore(result);
      if (score == null || condition.value == null) return false;
      return operatorMatches(condition.operator, score, condition.value);
    });
  }

  /** Verifica que el análisis pertenezca a un paciente del doctor autenticado
   * y devuelve sus AnalysisResult ya cargados. */
  async loadAnalysisResultsForDoctor(userId: string, analysisId: string) {
    const doctor = await this.doctorsService.requireDoctorByUserId(userId);

    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(analysisId) },
      include: { patient: true },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');
    if (analysis.patient.doctorId !== doctor.id) {
      throw new ForbiddenException('No tienes acceso a este análisis');
    }

    const results = await this.prisma.analysisResult.findMany({
      where: { analysisId: BigInt(analysisId) },
    });

    return { doctor, results };
  }
}
