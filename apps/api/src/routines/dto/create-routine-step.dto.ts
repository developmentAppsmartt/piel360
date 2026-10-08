import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoutineStepDto {
  /** Opcional: sin este dato el paso se coloca al final de la rutina. Antes era
   * obligatorio y el formulario mandaba siempre 0, asi que todos los pasos
   * quedaban empatados y no se podian ordenar. */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  order?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  productIds?: number[];
}
