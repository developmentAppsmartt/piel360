import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  CLINICAL_TEXT_MAX_LENGTH,
  clinicalOptionValues,
} from '@piel360/shared';

const TEXT_MESSAGE = `Cada texto de la historia clínica admite hasta ${CLINICAL_TEXT_MAX_LENGTH} caracteres`;
const OPTION_MESSAGE = 'Valor no permitido en la historia clínica';

function Text() {
  return function (target: object, key: string) {
    IsOptional()(target, key);
    IsString()(target, key);
    MaxLength(CLINICAL_TEXT_MAX_LENGTH, { message: TEXT_MESSAGE })(target, key);
  };
}

function Option(values: readonly string[]) {
  return function (target: object, key: string) {
    IsOptional()(target, key);
    IsIn(values, { message: OPTION_MESSAGE })(target, key);
  };
}

/** `null` o ausente = sin dato. Los valores salen de @piel360/shared. */
export class ClinicalProfileDto {
  @Text() consultationReason?: string | null;
  @Option(clinicalOptionValues('sunExposure')) sunExposure?: string | null;
  @Text() cosmeticRoutine?: string | null;
  @Text() recentProcedures?: string | null;
  @Text() relevantMedication?: string | null;
  @Text() knownAllergies?: string | null;
  @Text() dermatologicalHistory?: string | null;
  @Option(clinicalOptionValues('frequentSensitivity'))
  frequentSensitivity?: string | null;
  @Option(clinicalOptionValues('pregnancyLactation'))
  pregnancyLactation?: string | null;
  @Option(clinicalOptionValues('smoking')) smoking?: string | null;
  @Option(clinicalOptionValues('alcohol')) alcohol?: string | null;
  @Option(clinicalOptionValues('sleepQuality')) sleepQuality?: string | null;
  @Option(clinicalOptionValues('stressLevel')) stressLevel?: string | null;
  @Option(clinicalOptionValues('menopause')) menopause?: string | null;
  @Option(clinicalOptionValues('pcos')) pcos?: string | null;
  @Text() contraceptiveMethod?: string | null;
  @Text() expectations?: string | null;
  @Option(clinicalOptionValues('recoveryAvailability'))
  recoveryAvailability?: string | null;
  @Text() aestheticHistoryDetail?: string | null;
}

export class ClinicalConsentsDto {
  @IsOptional() @IsBoolean() photos?: boolean | null;
  @IsOptional() @IsBoolean() informed?: boolean | null;
}

/** Reemplazo completo: lo que no viene queda vacío / sin responder. */
export class SaveClinicalHistoryDto {
  @ValidateNested()
  @Type(() => ClinicalProfileDto)
  profile!: ClinicalProfileDto;

  @ValidateNested()
  @Type(() => ClinicalConsentsDto)
  consents!: ClinicalConsentsDto;

  /** Clave de la pregunta del catálogo → true (Sí), false (No), null (sin responder).
   * Las claves se validan contra el catálogo en el servicio. */
  @IsObject()
  answers!: Record<string, boolean | null>;
}
