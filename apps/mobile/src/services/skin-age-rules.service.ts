import { apiRequest } from './api.client';

export type SkinAgeRecoItem = {
  id: string;
  name: string;
  description: string | null;
  stepsCount?: number;
  categoryName?: string | null;
  productUrl?: string | null;
  imageUrl?: string | null;
  steps?: {
    id: string;
    order: number;
    title: string;
    description: string | null;
    mediaUrl: string | null;
    mediaType: 'image' | 'video' | 'gif' | null;
    products: {
      id: string;
      productName: string;
      productType: string;
      productUrl?: string | null;
      imageUrl?: string | null;
    }[];
  }[];
  items?: {
    id: string;
    productId: string;
    productName: string;
    productType: string;
    note: string | null;
    imageUrl?: string | null;
    productUrl?: string | null;
  }[];
};

export type SkinAgeRulePriority = 'low' | 'medium' | 'high' | 'very_high';
export type SkinAgeRuleColorKey =
  | 'green'
  | 'blue'
  | 'orange'
  | 'amber'
  | 'red';

export type SkinAgeRule = {
  id: string;
  doctorId: string;
  label: string;
  description: string | null;
  minDifference: number;
  maxDifference: number;
  priority: SkinAgeRulePriority;
  colorKey: SkinAgeRuleColorKey;
  sortOrder: number;
  isActive: boolean;
  routineIds: string[];
  treatmentIds: string[];
  productGroupIds: string[];
  supplementGroupIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SkinAgeMatchedRule = {
  id: string;
  label: string;
  description: string | null;
  minDifference: number;
  maxDifference: number;
  priority: string;
  colorKey: string;
};

export type SkinAgeRecommended = {
  snapshot: {
    skinAgeYears: number | null;
    chronologicalAgeYears: number | null;
    skinAgeDifference: number | null;
    message: string | null;
  };
  matchedRule: SkinAgeMatchedRule | null;
  recommendations: {
    routines: SkinAgeRecoItem[];
    treatments: SkinAgeRecoItem[];
    products: SkinAgeRecoItem[];
    supplements: SkinAgeRecoItem[];
  };
};

export const skinAgeRulesService = {
  async list(): Promise<SkinAgeRule[]> {
    return apiRequest<SkinAgeRule[]>('/skin-age-rules', { auth: true });
  },

  async simulate(input: {
    birthDate: string;
    skinAgeYears: number;
  }): Promise<SkinAgeRecommended> {
    return apiRequest<SkinAgeRecommended>('/skin-age-rules/simulate', {
      method: 'POST',
      auth: true,
      body: input,
    });
  },

  async setActive(id: string, isActive: boolean): Promise<SkinAgeRule> {
    return apiRequest<SkinAgeRule>(
      `/skin-age-rules/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        auth: true,
        body: { isActive },
      },
    );
  },

  async recommendForAnalysis(analysisId: string): Promise<SkinAgeRecommended> {
    return apiRequest<SkinAgeRecommended>(
      `/analyses/${encodeURIComponent(analysisId)}/care-recommendations`,
      { auth: true },
    );
  },

  async getMySkinCareTips(): Promise<SkinAgeRecommended> {
    return apiRequest<SkinAgeRecommended>('/me/skin-care-tips', { auth: true });
  },
};
