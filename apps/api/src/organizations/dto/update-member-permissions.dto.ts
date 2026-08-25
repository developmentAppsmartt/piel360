import { IsArray, IsIn } from 'class-validator';
import {
  TEAM_MEMBER_PERMISSIONS,
  type TeamMemberPermission,
} from '@piel360/shared';

export class UpdateMemberPermissionsDto {
  @IsArray()
  @IsIn([...TEAM_MEMBER_PERMISSIONS], { each: true })
  permissions!: TeamMemberPermission[];
}
