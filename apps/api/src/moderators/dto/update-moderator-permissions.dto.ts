import { IsArray, IsIn } from 'class-validator';
import {
  MODERATOR_PERMISSIONS,
  type ModeratorPermission,
} from '@piel360/shared';

export class UpdateModeratorPermissionsDto {
  @IsArray()
  @IsIn([...MODERATOR_PERMISSIONS], { each: true })
  permissions!: ModeratorPermission[];
}
