import { IsArray, IsNumberString, IsOptional, IsString } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsNumberString({}, { each: true })
  permissionIds?: string[];
}
