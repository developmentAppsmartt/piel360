import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  /** Correo de contacto — no implica crear cuenta por sí solo, ver `createAppAccess`. */
  @IsOptional()
  @IsEmail()
  email?: string;

  /** true = crear un `User` vinculado (login); exige `email`+`password`. */
  @IsOptional()
  @IsBoolean()
  createAppAccess?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

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
