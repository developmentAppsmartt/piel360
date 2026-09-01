import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSkiniverRechargeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  quantity!: number;

  /** ISO 8601 — opcional. */
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
