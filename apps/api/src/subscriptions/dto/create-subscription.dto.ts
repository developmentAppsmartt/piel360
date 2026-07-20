import { IsNumberString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsNumberString()
  userId!: string;

  @IsNumberString()
  planId!: string;
}
