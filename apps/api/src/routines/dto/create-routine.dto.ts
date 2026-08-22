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
import { RoutineConditionDto } from './routine-condition.dto';

export class CreateRoutineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  /** Reemplazo completo de la lista en cada create/update — más simple que
   * CRUD granular por condición individual. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineConditionDto)
  @IsOptional()
  conditions?: RoutineConditionDto[];
}
