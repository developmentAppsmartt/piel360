import { PartialType } from '@nestjs/mapped-types';
import { CreateRoutineStepDto } from './create-routine-step.dto';

export class UpdateRoutineStepDto extends PartialType(CreateRoutineStepDto) {}
