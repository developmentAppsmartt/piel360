import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ConfirmAnalysisDto {
  @IsOptional()
  @IsBoolean()
  isCorrected?: boolean;

  @IsOptional()
  @IsString()
  finalDiagnosis?: string;

  @IsOptional()
  @IsString()
  doctorNotes?: string;
}
