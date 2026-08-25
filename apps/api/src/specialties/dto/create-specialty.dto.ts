import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSpecialtyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
