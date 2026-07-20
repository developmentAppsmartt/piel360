import { IsIn, IsOptional } from 'class-validator';

const LANGUAGES = ['es', 'en'] as const;

export class UpdateMeDto {
  @IsOptional()
  @IsIn(LANGUAGES)
  diagnosticLanguage?: (typeof LANGUAGES)[number];
}
