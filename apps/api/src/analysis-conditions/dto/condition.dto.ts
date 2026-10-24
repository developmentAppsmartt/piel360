import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  CONDITIONABLE_METRIC_TYPES,
  ANALISIS_PIEL360_SKIN_TYPE_VALUES,
} from '@piel360/shared';

/** "between" es genérico — sirve para cualquier métrica numérica, no solo
 * edad (ej. "hd_wrinkle entre 40 y 60"). `value` = límite inferior,
 * `valueTo` = límite superior (ambos inclusive). */
export const CONDITION_OPERATORS = [
  'lt',
  'lte',
  'eq',
  'gte',
  'gt',
  'between',
] as const;

/** Los puntajes van de 0 a 100; la edad del paciente también queda ahí. */
const RANGO = { message: 'El valor de la condición debe estar entre 0 y 100' };

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
  @Min(0, RANGO)
  @Max(100, RANGO)
  value?: number;

  @ValidateIf(
    (o: ConditionDto) =>
      o.metricType !== 'hd_skin_type' && o.operator === 'between',
  )
  @IsNumber()
  @Min(0, RANGO)
  @Max(100, RANGO)
  valueTo?: number;

  @ValidateIf((o: ConditionDto) => o.metricType === 'hd_skin_type')
  @IsIn(ANALISIS_PIEL360_SKIN_TYPE_VALUES)
  textValue?: string;
}
