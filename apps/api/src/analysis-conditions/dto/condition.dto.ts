import { IsIn, IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';
import { CONDITIONABLE_METRIC_TYPES, YOUCAM_SKIN_TYPE_VALUES } from '@piel360/shared';

export const CONDITION_OPERATORS = ['lt', 'lte', 'eq', 'gte', 'gt'] as const;

/** Condición sobre un análisis YouCam — mismo shape reusado por
 * RoutineCondition y TreatmentCondition. La mayoría de métricas son
 * numéricas (`value`); `hd_skin_type` es categórica (`textValue`), nunca
 * ambas. */
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

  @ValidateIf((o: ConditionDto) => o.metricType === 'hd_skin_type')
  @IsIn(YOUCAM_SKIN_TYPE_VALUES)
  textValue?: string;
}
