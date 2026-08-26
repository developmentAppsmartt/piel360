import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ConditionDto } from '../../analysis-conditions/dto/condition.dto';

export class CreateTreatmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Sin valor = "producto sugerido" (sin categoría). Con valor = "tratamiento". */
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  /** Reemplazo completo de la lista en cada create/update — mismo criterio
   * que CreateRoutineDto. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  @IsOptional()
  conditions?: ConditionDto[];
}
