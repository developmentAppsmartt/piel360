export type SubscriptionStatus = 'active' | 'pending' | 'cancelled';

export type SubscriptionInvoice = {
  id: string;
  /** Total cobrado (plan + IVA). */
  grossAmount: string;
  planBaseAmount: string;
  ivaAmount: string;
  currency: string;
  createdAt: string;
};

export type Subscription = {
  id: string;
  status: SubscriptionStatus;
  endsAt: string | null;
  wompiTransactionId: string | null;
  createdAt: string;
  updatedAt?: string;
  remainingCredits: number;
  invoice?: SubscriptionInvoice | null;
  plan: {
    id: string;
    name: string;
    description?: string | null;
    features?: { label: string; included: boolean }[];
    analysisLimit: number;
    analysisLimits?: { skiniver?: number; aesthetic?: number };
    durationDays: number;
    price: string;
    customerPrice?: string;
    provider: {
      slug: string;
      name: string;
      displayLabel?: string | null;
    };
  };
};
