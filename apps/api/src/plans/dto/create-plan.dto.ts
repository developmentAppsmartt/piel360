import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name!: string;

  @IsNumberString()
  analysisProviderId!: string;

  @Type(() => Number)
  @IsNumber()
  analysisLimit!: number;

  @Type(() => Number)
  @IsNumber()
  price!: number;

  @Type(() => Number)
  @IsNumber()
  durationDays!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
