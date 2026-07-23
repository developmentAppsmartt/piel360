import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateConversationDto {
  /** Doctor inicia chat con un paciente propio. */
  @ValidateIf((o: CreateConversationDto) => !o.doctorId)
  @IsString()
  patientId?: string;

  /** Paciente inicia chat con su doctor. */
  @ValidateIf((o: CreateConversationDto) => !o.patientId)
  @IsString()
  doctorId?: string;
}

export class SendMessageDto {
  @IsIn(['text', 'image', 'video', 'pdf'])
  type!: 'text' | 'image' | 'video' | 'pdf';

  @ValidateIf((o: SendMessageDto) => o.type === 'text')
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body?: string;

  @ValidateIf((o: SendMessageDto) => o.type !== 'text')
  @IsString()
  attachmentKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  attachmentName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  sizeBytes?: number;
}

export class UpdateConversationDto {
  @IsOptional()
  archived?: boolean;
}
