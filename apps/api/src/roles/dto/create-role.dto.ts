import { IsArray, IsNumberString, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name!: string;

  @IsArray()
  @IsNumberString({}, { each: true })
  permissionIds!: string[];
}
