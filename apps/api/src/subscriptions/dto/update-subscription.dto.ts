import {
  IsIn,
  IsNumberString,
  IsOptional,
} from 'class-validator';

const ADMIN_STATUSES = ['active', 'cancelled'] as const;

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsNumberString()
  userId?: string;

  @IsOptional()
  @IsNumberString()
  planId?: string;

  @IsOptional()
  @IsIn(ADMIN_STATUSES)
  status?: (typeof ADMIN_STATUSES)[number];
}
