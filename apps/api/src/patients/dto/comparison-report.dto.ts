import {
  IsIn,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ComparisonReportDto {
  @IsIn(['aesthetic', 'derm'])
  mode!: 'aesthetic' | 'derm';

  @IsNumberString()
  initialId!: string;

  @IsNumberString()
  currentId!: string;

  /** Las notas de Comparaciones viven en el navegador del profesional: se
   * mandan con la descarga para que salgan en el PDF. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  generalNote?: string;

  @IsOptional()
  @IsObject()
  categoryNotes?: Record<string, string>;
}
