import { apiRequest } from './api.client';

export type RoutineCondition = {
  id?: string;
  metricType: string;
  region?: string | null;
  operator: string;
  value: number | null;
  textValue?: string | null;
};

export type RoutineStep = {
  id: string;
  routineId: string;
  order: number;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'gif' | null;
  productId: string | null;
};

export type RecommendedRoutine = {
  id: string;
  doctorId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  conditions: RoutineCondition[];
  steps: RoutineStep[];
};

export const routinesService = {
  async list(): Promise<RecommendedRoutine[]> {
    return apiRequest<RecommendedRoutine[]>('/routines', { auth: true });
  },

  async listRecommended(analysisId: string): Promise<RecommendedRoutine[]> {
    return apiRequest<RecommendedRoutine[]>(
      `/routines/recommended/${encodeURIComponent(analysisId)}`,
      { auth: true },
    );
  },
};
