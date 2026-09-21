import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmAnalysisDto {
  @IsOptional()
  @IsBoolean()
  isCorrected?: boolean;

  @IsOptional()
  @IsString()
  finalDiagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  doctorNotes?: string;
}
