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
  /** Biotipos a los que aplica; vacío = todos. */
  skinTypes: string[];
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
  skinTypes?: string[];
  priority: string;
  colorKey?: string;
};

export type FitzpatrickRecommended = {
  snapshot: {
    fitzpatrickScale: string | null;
    /** Biotipo con el que se simuló; null si no se eligió. */
    skinType?: string | null;
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

  /** `skinType` vacío/omitido = sin biotipo (como en el CRM). */
  async simulate(
    fitzpatrickScale: string,
    skinType?: string,
  ): Promise<FitzpatrickRecommended> {
    return apiRequest<FitzpatrickRecommended>('/fitzpatrick-rules/simulate', {
      method: 'POST',
      auth: true,
      body: {
        fitzpatrickScale,
        ...(skinType ? { skinType } : {}),
      },
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
