import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WeeklySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(TIME_RE)
  startTime!: string;

  @IsString()
  @Matches(TIME_RE)
  endTime!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReplaceWeeklySlotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklySlotDto)
  slots!: WeeklySlotDto[];
}

export class CreateBlockedDayDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateAppointmentDto {
  @IsString()
  @MinLength(1)
  patientId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class PatientRequestAppointmentDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateAppointmentStatusDto {
  @IsIn(['confirmed', 'declined', 'cancelled', 'completed'])
  status!: 'confirmed' | 'declined' | 'cancelled' | 'completed';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
