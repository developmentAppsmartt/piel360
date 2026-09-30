import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  TEAM_MEMBER_PERMISSIONS,
  type TeamMemberPermission,
} from '@piel360/shared';

export class AddTeamDoctorDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  specialty!: string;

  /**
   * Decide qué campos y documentos se le piden al miembro (ver
   * apps/web/src/lib/doctor-documents.ts). Sin esto, un técnico laboral nacía
   * sin tipo y el panel de verificación le exigía los documentos de médico.
   */
  @IsOptional()
  @IsIn(['specialty', 'labor'])
  professionalKind?: 'specialty' | 'labor';

  @IsOptional()
  @IsArray()
  @IsIn([...TEAM_MEMBER_PERMISSIONS], { each: true })
  permissions?: TeamMemberPermission[];
}
