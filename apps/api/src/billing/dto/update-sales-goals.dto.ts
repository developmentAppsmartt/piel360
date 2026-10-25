import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class UpdateSalesGoalsDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'El mes debe ser YYYY-MM' })
  month!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  aesthetic?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  derm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  fototipo?: number;
}
