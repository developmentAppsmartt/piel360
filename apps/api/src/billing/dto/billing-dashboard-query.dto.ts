import { IsIn, IsOptional, Matches } from 'class-validator';

const PLAN_TYPES = ['aesthetic', 'derm', 'fototipo', 'mixed'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class BillingDashboardQueryDto {
  @IsOptional()
  @Matches(ISO_DATE, { message: 'from debe ser YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(ISO_DATE, { message: 'to debe ser YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @IsIn(PLAN_TYPES)
  planType?: (typeof PLAN_TYPES)[number];
}
