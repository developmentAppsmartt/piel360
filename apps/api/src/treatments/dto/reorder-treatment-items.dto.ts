import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderTreatmentItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedItemIds: string[];
}
