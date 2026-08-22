import { PartialType } from '@nestjs/mapped-types';
import { CreateTreatmentItemDto } from './create-treatment-item.dto';

export class UpdateTreatmentItemDto extends PartialType(
  CreateTreatmentItemDto,
) {}
