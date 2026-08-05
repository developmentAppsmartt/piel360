import type { AnalysisDetail, PatientAnalysisSummary } from '../types/analysis';
import { apiRequest } from './api.client';

export const analysesService = {
  async list(): Promise<PatientAnalysisSummary[]> {
    return apiRequest<PatientAnalysisSummary[]>('/analyses', { auth: true });
  },

  async getById(id: string): Promise<AnalysisDetail> {
    return apiRequest<AnalysisDetail>(`/analyses/${id}`, { auth: true });
  },

  /** Doctor/admin: publica el análisis en el historial del paciente. */
  async shareWithPatient(id: string): Promise<AnalysisDetail> {
    return apiRequest<AnalysisDetail>(`/analyses/${id}/share`, {
      method: 'PATCH',
      auth: true,
    });
  },
};
