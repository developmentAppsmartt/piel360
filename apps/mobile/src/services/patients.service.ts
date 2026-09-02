import type { PatientAnalysisSummary } from '../types/analysis';
import type { PatientProfile } from '../types/patient';
import { apiRequest } from './api.client';

export type UpdatePatientInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  areaCode?: string;
  phoneTicket?: string;
  docType?: string;
  docNumber?: string;
  address?: string;
  lat?: number;
  lng?: number;
  birthDate?: string;
  gender?: string;
  mascotType?: string;
  birthType?: string;
  exerciseHabit?: string;
  exerciseDaysPerWeek?: string;
  exerciseSessionDuration?: string;
  skinType?: string;
  fitzpatrickType?: string;
};

export type CreatePatientInput = {
  firstName: string;
  lastName: string;
  email?: string;
  password?: string;
  phone?: string;
  areaCode?: string;
  docType?: string;
  docNumber?: string;
  address?: string;
  lat?: number;
  lng?: number;
  birthDate?: string;
  gender?: string;
  mascotType?: string;
  birthType?: string;
  exerciseHabit?: string;
  exerciseDaysPerWeek?: string;
  exerciseSessionDuration?: string;
  skinType?: string;
  fitzpatrickType?: string;
};

export const patientsService = {
  async list(): Promise<PatientProfile[]> {
    return apiRequest<PatientProfile[]>('/patients', { auth: true });
  },

  async getById(id: string): Promise<PatientProfile> {
    return apiRequest<PatientProfile>(`/patients/${id}`, { auth: true });
  },

  async getMyPatient(): Promise<PatientProfile | null> {
    const list = await this.list();
    return list[0] ?? null;
  },

  async create(input: CreatePatientInput): Promise<PatientProfile> {
    return apiRequest<PatientProfile>('/patients', {
      method: 'POST',
      auth: true,
      body: input,
    });
  },

  async update(id: string, input: UpdatePatientInput): Promise<PatientProfile> {
    return apiRequest<PatientProfile>(`/patients/${id}`, {
      method: 'PATCH',
      auth: true,
      body: input,
    });
  },

  async listAnalyses(patientId: string): Promise<PatientAnalysisSummary[]> {
    return apiRequest<PatientAnalysisSummary[]>(
      `/patients/${patientId}/analyses`,
      { auth: true },
    );
  },

  async submitSurvey(input: {
    skinType?: string;
    fitzpatrickType?: string;
    surveyResponses: Record<string, string>;
  }): Promise<{
    surveyCompletedAt: string | null;
    surveyResponses: unknown;
  }> {
    return apiRequest('/me/survey', {
      method: 'POST',
      auth: true,
      body: input,
    });
  },

  async createAnalysisRequest(
    patientId: string,
    providerSlug: 'skiniver' | 'youcam' | 'fitzpatrick',
  ): Promise<AnalysisRequest> {
    return apiRequest(`/patients/${patientId}/analysis-requests`, {
      method: 'POST',
      auth: true,
      body: { providerSlug },
    });
  },

  async getMyPendingAnalysisRequests(): Promise<AnalysisRequest[]> {
    return apiRequest('/me/analysis-requests/pending', { auth: true });
  },

  async listPendingAnalysisRequests(
    patientId: string,
  ): Promise<AnalysisRequest[]> {
    return apiRequest(`/patients/${patientId}/analysis-requests/pending`, {
      auth: true,
    });
  },

  async cancelAnalysisRequest(
    patientId: string,
    requestId: string,
  ): Promise<AnalysisRequest> {
    return apiRequest(
      `/patients/${patientId}/analysis-requests/${requestId}`,
      { method: 'DELETE', auth: true },
    );
  },

  async completeMyAnalysisRequest(requestId: string): Promise<AnalysisRequest> {
    return apiRequest(`/me/analysis-requests/${requestId}/complete`, {
      method: 'PATCH',
      auth: true,
    });
  },
};

export type AnalysisRequest = {
  id: string;
  patientId: string;
  doctorId: string;
  providerSlug: 'skiniver' | 'youcam' | 'fitzpatrick' | string;
  status: string;
  createdAt: string;
  updatedAt: string;
};
