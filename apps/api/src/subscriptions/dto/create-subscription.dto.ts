import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
} from 'class-validator';

const STATUSES = ['pending', 'active', 'cancelled'] as const;

export class CreateSubscriptionDto {
  @IsNumberString()
  userId!: string;

  @IsNumberString()
  planId!: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
