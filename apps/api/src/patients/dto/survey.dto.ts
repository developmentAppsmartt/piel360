import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

const FITZPATRICK_TYPES = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

export class SurveyDto {
  @IsOptional()
  @IsString()
  skinType?: string;

  @IsOptional()
  @IsIn(FITZPATRICK_TYPES)
  fitzpatrickType?: (typeof FITZPATRICK_TYPES)[number];

  @IsObject()
  surveyResponses!: Record<string, unknown>;
}
