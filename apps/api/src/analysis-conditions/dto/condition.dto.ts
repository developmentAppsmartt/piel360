import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { YOUCAM_DST_ACTIONS } from '@piel360/shared';

export const CONDITION_OPERATORS = ['lt', 'lte', 'eq', 'gte', 'gt'] as const;

/** Condición sobre un puntaje de análisis YouCam — mismo shape reusado por
 * RoutineCondition y TreatmentCondition. */
export class ConditionDto {
  @IsIn(YOUCAM_DST_ACTIONS)
  metricType: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsIn(CONDITION_OPERATORS)
  operator: string;

  @IsNumber()
  value: number;
}
