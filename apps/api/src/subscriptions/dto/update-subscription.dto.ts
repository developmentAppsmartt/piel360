import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
} from 'class-validator';

const STATUSES = ['pending', 'active', 'cancelled'] as const;

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsNumberString()
  userId?: string;

  @IsOptional()
  @IsNumberString()
  planId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
