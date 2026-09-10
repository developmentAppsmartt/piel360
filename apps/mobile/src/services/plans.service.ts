import { apiRequest } from './api.client';

export type CatalogPlan = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  analysisLimit: number;
  durationDays: number;
  planType?: string;
  poolPurchasable?: boolean;
  poolUnavailableReason?: string | null;
  provider: {
    slug: string;
    name: string;
    displayLabel?: string | null;
  };
  providers?: Array<{
    slug: string;
    name: string;
    displayLabel: string | null;
  }>;
};

export const plansService = {
  async list(): Promise<CatalogPlan[]> {
    return apiRequest<CatalogPlan[]>('/plans', { auth: true });
  },
};
