import type { AnalysisDetail, PatientAnalysisSummary } from '../types/analysis';
import { apiRequest } from './api.client';
import { appendImageField } from './form-image';

export type ConfirmAnalysisInput = {
  isCorrected: boolean;
  finalDiagnosis?: string;
  doctorNotes?: string;
};

export type CreateSkiniverAnalysisInput = {
  patientId: string;
  imageUri: string;
  bodyRegion?: string;
  xCoord?: number;
  yCoord?: number;
  zCoord?: number;
};

export const analysesService = {
  async list(): Promise<PatientAnalysisSummary[]> {
    return apiRequest<PatientAnalysisSummary[]>('/analyses', { auth: true });
  },

  async getById(id: string): Promise<AnalysisDetail> {
    return apiRequest<AnalysisDetail>(`/analyses/${id}`, { auth: true });
  },

  /** Skiniver — `POST /analyses` (dermatológico). */
  async create(input: CreateSkiniverAnalysisInput): Promise<AnalysisDetail> {
    const form = new FormData();
    await appendImageField(form, 'image', input.imageUri);
    form.append('patientId', input.patientId);
    if (input.bodyRegion) form.append('bodyRegion', input.bodyRegion);
    if (input.xCoord !== undefined) form.append('xCoord', String(input.xCoord));
    if (input.yCoord !== undefined) form.append('yCoord', String(input.yCoord));
    if (input.zCoord !== undefined) form.append('zCoord', String(input.zCoord));

    return apiRequest<AnalysisDetail>('/analyses', {
      method: 'POST',
      auth: true,
      body: form,
      formData: true,
    });
  },

  /** Doctor/admin: confirma o corrige el diagnóstico del análisis. */
  async confirm(
    id: string,
    input: ConfirmAnalysisInput,
  ): Promise<AnalysisDetail> {
    return apiRequest<AnalysisDetail>(`/analyses/${id}/confirm`, {
      method: 'PATCH',
      auth: true,
      body: input,
    });
  },

  /** Doctor/admin: publica el análisis en el historial del paciente. */
  async shareWithPatient(id: string): Promise<AnalysisDetail> {
    return apiRequest<AnalysisDetail>(`/analyses/${id}/share`, {
      method: 'PATCH',
      auth: true,
    });
  },
};
