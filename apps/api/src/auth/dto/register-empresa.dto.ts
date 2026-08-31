import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { MembershipType } from '@piel360/shared';

const EMPRESA_MEMBERSHIP_TYPES = [
  'empresa',
  'empresa_aliada',
] as const satisfies readonly MembershipType[];

export class RegisterEmpresaDto {
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

  @IsOptional()
  @IsString()
  phoneTicket?: string;

  @IsIn([...EMPRESA_MEMBERSHIP_TYPES])
  membershipType!: (typeof EMPRESA_MEMBERSHIP_TYPES)[number];

  @IsString()
  @MaxLength(200)
  organizationName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ciiuCode?: string;

  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  businessPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  employeeCountRange?: string;

  @IsString()
  @MaxLength(200)
  legalRepName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  legalRepDocType?: string;

  @IsString()
  @MaxLength(64)
  legalRepDocNumber!: string;

  @IsString()
  @MaxLength(500)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
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
}
