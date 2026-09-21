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
import {
  LOCATION_TYPES,
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_MESSAGE,
  PASSWORD_STRENGTH_REGEX,
  type LocationType,
} from '@piel360/shared';

export class RegisterDoctorDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_STRENGTH_REGEX, { message: PASSWORD_STRENGTH_MESSAGE })
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

  /** Opcional: ticket de `POST /auth/otp/verify` (purpose=register) si se verificó el correo. */
  @IsOptional()
  @IsString()
  emailTicket?: string;

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
  @IsDateString()
  birthDate!: string;

  @IsString()
  @IsNotEmpty()
  gender!: string;

  /** Nombre de la especialidad médica o del perfil de técnico laboral. */
  @IsString()
  @IsNotEmpty()
  specialty!: string;

  @IsString()
  @IsNotEmpty()
  medicalRegistry!: string;

  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @IsString()
  @IsNotEmpty()
  educationEntity!: string;

  @IsString()
  @IsNotEmpty()
  graduationInstitution!: string;

  /**
   * Solo técnicos laborales — institución de educación para el trabajo.
   * Se deja opcional a nivel de DTO: el backend no puede distinguir de forma
   * confiable "especialidad médica" vs "técnico laboral" (ambos casos
   * comparten el campo `specialty`) — el frontend ya lo exige (`required`)
   * únicamente cuando corresponde.
   */
  @IsOptional()
  @IsString()
  technicalInstitution?: string;

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

  /** Código de empresa aliada (registro vía URL/QR de referidos). */
  @IsOptional()
  @IsString()
  referralCode?: string;
}
