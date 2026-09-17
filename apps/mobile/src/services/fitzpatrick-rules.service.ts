import { apiRequest } from './api.client';
import type { SkinAgeRecoItem } from './skin-age-rules.service';

export type FitzpatrickRulePriority = 'low' | 'medium' | 'high' | 'very_high';
export type FitzpatrickRuleColorKey =
  | 'green'
  | 'blue'
  | 'orange'
  | 'amber'
  | 'red';

export type FitzpatrickRule = {
  id: string;
  doctorId: string;
  label: string;
  description: string | null;
  fitzpatrickScale: string;
  priority: FitzpatrickRulePriority;
  colorKey: FitzpatrickRuleColorKey;
  sortOrder: number;
  isActive: boolean;
  routineIds: string[];
  treatmentIds: string[];
  productGroupIds: string[];
  supplementGroupIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type FitzpatrickMatchedRule = {
  id: string;
  label: string;
  description: string | null;
  fitzpatrickScale: string;
  priority: string;
  colorKey?: string;
};

export type FitzpatrickRecommended = {
  snapshot: {
    fitzpatrickScale: string | null;
    message: string | null;
  };
  matchedRule: FitzpatrickMatchedRule | null;
  recommendations: {
    routines: SkinAgeRecoItem[];
    treatments: SkinAgeRecoItem[];
    products: SkinAgeRecoItem[];
    supplements: SkinAgeRecoItem[];
  };
};

export const fitzpatrickRulesService = {
  async list(): Promise<FitzpatrickRule[]> {
    return apiRequest<FitzpatrickRule[]>('/fitzpatrick-rules', { auth: true });
  },

  async simulate(fitzpatrickScale: string): Promise<FitzpatrickRecommended> {
    return apiRequest<FitzpatrickRecommended>('/fitzpatrick-rules/simulate', {
      method: 'POST',
      auth: true,
      body: { fitzpatrickScale },
    });
  },

  async setActive(id: string, isActive: boolean): Promise<FitzpatrickRule> {
    return apiRequest<FitzpatrickRule>(
      `/fitzpatrick-rules/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        auth: true,
        body: { isActive },
      },
    );
  },

  async recommendForAnalysis(
    analysisId: string,
  ): Promise<FitzpatrickRecommended> {
    return apiRequest<FitzpatrickRecommended>(
      `/analyses/${encodeURIComponent(analysisId)}/fitzpatrick-recommendations`,
      { auth: true },
    );
  },
};
