import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTreatmentItemDto {
  @IsNotEmpty()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @Type(() => Number)
  order: number;

  @IsString()
  @IsOptional()
  note?: string;
}
