import {
  IsIn,
  IsNumberString,
  IsOptional,
} from 'class-validator';

const ADMIN_STATUSES = ['active', 'cancelled'] as const;

export class CreateSubscriptionDto {
  @IsNumberString()
  userId!: string;

  @IsNumberString()
  planId!: string;

  @IsOptional()
  @IsIn(ADMIN_STATUSES)
  status?: (typeof ADMIN_STATUSES)[number];
}
