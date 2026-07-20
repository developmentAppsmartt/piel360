import { IsIn, IsOptional, IsString } from 'class-validator';

const LANGUAGES = ['es', 'en'] as const;

export class UpdateUserAdminDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(LANGUAGES)
  diagnosticLanguage?: (typeof LANGUAGES)[number];
}
