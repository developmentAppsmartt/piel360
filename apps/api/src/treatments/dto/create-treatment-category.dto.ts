import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTreatmentCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  categoryName: string;
}
