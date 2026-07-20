import { Type } from 'class-transformer';
import {
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateYoucamAnalysisDto {
  @IsNumberString()
  patientId!: string;

  @IsOptional()
  @IsString()
  bodyRegion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  xCoord?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yCoord?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  zCoord?: number;
}
