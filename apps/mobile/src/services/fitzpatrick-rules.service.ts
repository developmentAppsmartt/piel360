import { apiRequest } from './api.client';
import type { SkinAgeRecoItem } from './skin-age-rules.service';

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
  async recommendForAnalysis(
    analysisId: string,
  ): Promise<FitzpatrickRecommended> {
    return apiRequest<FitzpatrickRecommended>(
      `/analyses/${encodeURIComponent(analysisId)}/fitzpatrick-recommendations`,
      { auth: true },
    );
  },
};
