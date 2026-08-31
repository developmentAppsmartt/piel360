import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LOCATION_TYPES, type LocationType } from '@piel360/shared';

export class RegisterDoctorDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @Matches(/^\d{10,15}$/, {
    message:
      'Teléfono inválido — usa solo dígitos, con indicativo de país (10 a 15 dígitos)',
  })
  phone!: string;

  /** Opcional: ticket de `POST /auth/otp/phone/verify` si se verificó el teléfono. */
  @IsOptional()
  @IsString()
  phoneTicket?: string;

  /** Solo profesionales individuales — empresas usan POST /auth/register/empresa. */
  @IsOptional()
  @IsIn(['solo_doctor'])
  membershipType?: 'solo_doctor';

  @IsOptional()
  @IsString()
  docType?: string;

  @IsOptional()
  @IsString()
  docNumber?: string;

  /** ISO date `YYYY-MM-DD`. */
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  /** Nombre de la especialidad médica o del perfil de técnico laboral. */
  @IsString()
  @IsNotEmpty()
  specialty!: string;

  @IsOptional()
  @IsString()
  medicalRegistry?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  educationEntity?: string;

  @IsOptional()
  @IsString()
  graduationInstitution?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  country?: string;

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

  /** consultorio | spa | clinica | empresa_aliada | laboratorio */
  @IsOptional()
  @IsIn([...LOCATION_TYPES])
  locationType?: LocationType;
}
