import { IsNumberString } from 'class-validator';

export class CreateFitzpatrickAnalysisDto {
  @IsNumberString()
  patientId!: string;
}
