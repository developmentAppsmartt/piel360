import { IsIn, IsOptional } from 'class-validator';
import {
  ADDRESS_VERIFICATION_METHODS,
  ADDRESS_VERIFICATION_STATUSES,
  type AddressVerificationMethod,
  type AddressVerificationStatus,
} from '@piel360/shared';

export class UpdateDoctorAddressVerificationDto {
  @IsIn([...ADDRESS_VERIFICATION_STATUSES])
  status!: AddressVerificationStatus;

  @IsOptional()
  @IsIn([...ADDRESS_VERIFICATION_METHODS])
  method?: AddressVerificationMethod;
}
