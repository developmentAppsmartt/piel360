import {
  IsArray,
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsNumberString({}, { each: true })
  permissionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsNumberString({}, { each: true })
  specialtyIds?: string[];

  @IsOptional()
  @IsNumberString()
  laborTechnicianProfileId?: string | null;
}
