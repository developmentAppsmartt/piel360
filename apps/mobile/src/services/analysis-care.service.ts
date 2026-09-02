import { apiRequest } from './api.client';

export type CareRecoItem = {
  id: string;
  name: string;
  description: string | null;
  stepsCount?: number;
  categoryName?: string | null;
  productType?: string;
  productUrl?: string | null;
  imageUrl?: string | null;
  items?: {
    id: string;
    productId: string;
    productName: string;
    productType: string;
    note: string | null;
    imageUrl?: string | null;
    productUrl?: string | null;
  }[];
  steps?: {
    id: string;
    order: number;
    title: string;
    description: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
  }[];
};

export type AnalysisCareRecommendations = {
  snapshot: {
    skinAgeYears: number | null;
    chronologicalAgeYears: number | null;
    skinAgeDifference: number | null;
    message: string | null;
  };
  matchedRule: {
    id: string;
    label: string;
    description: string | null;
    minDifference: number;
    maxDifference: number;
    priority: string;
    colorKey: string;
  } | null;
  recommendations: {
    routines: CareRecoItem[];
    treatments: CareRecoItem[];
    products: CareRecoItem[];
    supplements: CareRecoItem[];
  };
  catalog: {
    routines: CareRecoItem[];
    treatments: CareRecoItem[];
    products: CareRecoItem[];
    supplements: CareRecoItem[];
  };
};

export const analysisCareService = {
  async getCareRecommendations(
    analysisId: string,
  ): Promise<AnalysisCareRecommendations> {
    return apiRequest<AnalysisCareRecommendations>(
      `/analyses/${encodeURIComponent(analysisId)}/care-recommendations`,
      { auth: true },
    );
  },
};
