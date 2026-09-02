import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  /** Ticket OTP al cambiar o confirmar el celular. */
  @IsOptional()
  @IsString()
  phoneTicket?: string;

  @IsOptional()
  @IsString()
  areaCode?: string;

  @IsOptional()
  @IsString()
  docType?: string;

  @IsOptional()
  @IsString()
  docNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  /** ISO date `YYYY-MM-DD` o datetime; se guarda como `@db.Date`. */
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  mascotType?: string;

  @IsOptional()
  @IsString()
  birthType?: string;

  @IsOptional()
  @IsString()
  exerciseHabit?: string;

  @IsOptional()
  @IsString()
  exerciseDaysPerWeek?: string;

  @IsOptional()
  @IsString()
  exerciseSessionDuration?: string;

  @IsOptional()
  @IsString()
  skinType?: string;

  @IsOptional()
  @IsString()
  fitzpatrickType?: string;
}
