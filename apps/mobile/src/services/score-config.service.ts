import {
  normalizeYoucamScoreConfig,
  type YoucamScoreConfig,
} from '../data/youcamScoreConfig';
import { apiRequest } from './api.client';

export const scoreConfigService = {
  /** Rangos y textos de la cuenta (la propia, la de la empresa o la del profesional). */
  async getMine(): Promise<YoucamScoreConfig> {
    const raw = await apiRequest<unknown>('/auth/me/score-config', {
      auth: true,
    });
    return normalizeYoucamScoreConfig(raw);
  },
};
