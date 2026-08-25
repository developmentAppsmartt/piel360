import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateModeratorDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  docType?: string;

  @IsOptional()
  @IsString()
  docNumber?: string;

  @IsOptional()
  @Matches(/^\d{10,15}$/, {
    message:
      'Teléfono inválido — usa solo dígitos, con indicativo de país (10 a 15 dígitos)',
  })
  phone?: string;
}
