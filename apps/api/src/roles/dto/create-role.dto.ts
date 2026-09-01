import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PRIMARY_PANELS } from '@piel360/shared';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  label!: string;

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
  @IsIn([...PRIMARY_PANELS])
  primaryPanel?: string;

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
  laborTechnicianProfileId?: string;
}
