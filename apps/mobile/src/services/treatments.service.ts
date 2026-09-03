import { apiRequest } from './api.client';

export type TreatmentCondition = {
  id?: string;
  metricType: string;
  region?: string | null;
  operator: string;
  value: number | null;
  textValue?: string | null;
};

export type TreatmentProduct = {
  id: string;
  productName: string;
  productType?: 'product' | 'supplement';
  productDescription: string | null;
  productUrl: string | null;
  imageUrl: string | null;
};

export type TreatmentItem = {
  id: string;
  treatmentId: string;
  order: number;
  note: string | null;
  productId: string;
  product: TreatmentProduct;
};

export type RecommendedTreatment = {
  id: string;
  doctorId: string;
  categoryId: string | null;
  category: { id: string; categoryName: string } | null;
  name: string;
  description: string | null;
  isActive: boolean;
  conditions: TreatmentCondition[];
  items: TreatmentItem[];
};

export const treatmentsService = {
  async list(kind?: 'plain' | 'treatment'): Promise<RecommendedTreatment[]> {
    const query = kind ? `?kind=${encodeURIComponent(kind)}` : '';
    return apiRequest<RecommendedTreatment[]>(`/treatments${query}`, {
      auth: true,
    });
  },

  async listRecommended(analysisId: string): Promise<RecommendedTreatment[]> {
    return apiRequest<RecommendedTreatment[]>(
      `/treatments/recommended/${encodeURIComponent(analysisId)}`,
      { auth: true },
    );
  },
};
