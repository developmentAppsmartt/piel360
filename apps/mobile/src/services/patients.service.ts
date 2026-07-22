import type { PatientAnalysisSummary } from '../types/analysis';
import type { PatientProfile } from '../types/patient';
import { apiRequest } from './api.client';

export type UpdatePatientInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  areaCode?: string;
  docType?: string;
  docNumber?: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  mascotType?: string;
  skinType?: string;
  fitzpatrickType?: string;
};

export type CreatePatientInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  areaCode?: string;
  docType?: string;
  docNumber?: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  mascotType?: string;
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
};
