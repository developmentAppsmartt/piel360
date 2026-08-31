import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
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

  @Matches(/^\d{10,15}$/, {
    message:
      'Teléfono inválido — usa solo dígitos, con indicativo de país (10 a 15 dígitos)',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  specialty!: string;

  @IsOptional()
  @IsArray()
  @IsIn([...TEAM_MEMBER_PERMISSIONS], { each: true })
  permissions?: TeamMemberPermission[];
}
