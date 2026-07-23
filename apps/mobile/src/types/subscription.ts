export type SubscriptionStatus = 'active' | 'pending' | 'cancelled';

export type Subscription = {
  id: string;
  status: SubscriptionStatus;
  endsAt: string | null;
  wompiTransactionId: string | null;
  createdAt: string;
  remainingCredits: number;
  plan: {
    id: string;
    name: string;
    analysisLimit: number;
    durationDays: number;
    price: string;
    provider: { slug: string; name: string };
  };
};
