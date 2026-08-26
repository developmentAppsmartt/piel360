import { IsIn, IsString } from 'class-validator';

export const ANALYSIS_REQUEST_PROVIDERS = [
  'skiniver',
  'youcam',
  'fitzpatrick',
] as const;

export type AnalysisRequestProvider =
  (typeof ANALYSIS_REQUEST_PROVIDERS)[number];

export class CreateAnalysisRequestDto {
  @IsString()
  @IsIn([...ANALYSIS_REQUEST_PROVIDERS])
  providerSlug!: AnalysisRequestProvider;
}
