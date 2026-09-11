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
    productId?: string | null;
    product?: {
      id: string;
      productName: string;
      productType: string;
      productUrl?: string | null;
      imageUrl?: string | null;
    } | null;
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
  async recommendForAnalysis(analysisId: string): Promise<SkinAgeRecommended> {
    return apiRequest<SkinAgeRecommended>(
      `/analyses/${encodeURIComponent(analysisId)}/care-recommendations`,
      { auth: true },
    );
  },

  /** Consejos del paciente autenticado según reglas de edad de piel. */
  async getMySkinCareTips(): Promise<SkinAgeRecommended> {
    return apiRequest<SkinAgeRecommended>('/me/skin-care-tips', { auth: true });
  },
};
