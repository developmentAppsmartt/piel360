import type { Subscription } from '../types/subscription';
import { apiRequest } from './api.client';

export const subscriptionsService = {
  async listMine(): Promise<Subscription[]> {
    return apiRequest<Subscription[]>('/me/subscriptions', { auth: true });
  },
};
