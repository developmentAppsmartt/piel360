import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmAnalysisDto {
  @IsOptional()
  @IsBoolean()
  isCorrected?: boolean;

  @IsOptional()
  @IsString()
  finalDiagnosis?: string;

  /** Id del clasificador de la condición elegida (`3C_melanoma`). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  finalDiagnosisCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  doctorNotes?: string;
}
