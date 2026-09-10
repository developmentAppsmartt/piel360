import { IsIn, IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';
import { CONDITIONABLE_METRIC_TYPES, YOUCAM_SKIN_TYPE_VALUES } from '@piel360/shared';

/** "between" es genérico — sirve para cualquier métrica numérica, no solo
 * edad (ej. "hd_wrinkle entre 40 y 60"). `value` = límite inferior,
 * `valueTo` = límite superior (ambos inclusive). */
export const CONDITION_OPERATORS = ['lt', 'lte', 'eq', 'gte', 'gt', 'between'] as const;

/** Condición sobre un análisis YouCam — mismo shape reusado por
 * RoutineCondition y TreatmentCondition. La mayoría de métricas son
 * numéricas (`value`, y `valueTo` si `operator` es "between");
 * `hd_skin_type` es categórica (`textValue`), nunca junto con `value`. */
export class ConditionDto {
  @IsIn(CONDITIONABLE_METRIC_TYPES)
  metricType: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsIn(CONDITION_OPERATORS)
  operator: string;

  @ValidateIf((o: ConditionDto) => o.metricType !== 'hd_skin_type')
  @IsNumber()
  value?: number;

  @ValidateIf((o: ConditionDto) => o.metricType !== 'hd_skin_type' && o.operator === 'between')
  @IsNumber()
  valueTo?: number;

  @ValidateIf((o: ConditionDto) => o.metricType === 'hd_skin_type')
  @IsIn(YOUCAM_SKIN_TYPE_VALUES)
  textValue?: string;
}
