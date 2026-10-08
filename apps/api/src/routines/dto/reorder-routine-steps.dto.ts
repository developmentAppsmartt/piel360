import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderRoutineStepsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedStepIds: string[];
}
