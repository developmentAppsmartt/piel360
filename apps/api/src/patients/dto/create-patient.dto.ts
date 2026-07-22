import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

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
  skinType?: string;

  @IsOptional()
  @IsString()
  fitzpatrickType?: string;
}
