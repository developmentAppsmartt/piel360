import { IsBoolean } from 'class-validator';

export class UpdatePermissionDto {
  @IsBoolean()
  isActive!: boolean;
}
