import { IsNumberString } from 'class-validator';

export class CreateCheckoutDto {
  @IsNumberString()
  planId!: string;
}
