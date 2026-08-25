import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  VERIFICATION_STATUSES,
  type VerificationStatus,
} from '@piel360/shared';

export class UpdateDoctorVerificationDto {
  @IsIn(['active', 'rejected', 'approved', 'pending', 'in_review'])
  status!: Extract<
    VerificationStatus,
    'active' | 'rejected' | 'approved' | 'pending' | 'in_review'
  >;

  @IsOptional()
  @IsString()
  note?: string;
}

export { VERIFICATION_STATUSES };
