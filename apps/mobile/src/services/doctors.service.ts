import { apiRequest } from './api.client';

export type DoctorProfile = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
  docType: string | null;
  docNumber: string | null;
  phone: string | null;
  specialty: string | null;
  medicalRegistry: string | null;
  licenseNumber: string | null;
  educationEntity: string | null;
  graduationInstitution: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  zip: string | null;
  lat: string | number | null;
  lng: string | number | null;
  verificationStatus: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { email: string } | null;
};

export type UpdateDoctorInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  docType?: string;
  docNumber?: string;
  birthDate?: string;
  gender?: string;
  specialty?: string;
  medicalRegistry?: string;
  licenseNumber?: string;
  educationEntity?: string;
  graduationInstitution?: string;
  address?: string;
  city?: string;
  country?: string;
  zip?: string;
  lat?: number;
  lng?: number;
};

export const doctorsService = {
  async getMe(): Promise<DoctorProfile> {
    return apiRequest<DoctorProfile>('/doctors/me', { auth: true });
  },

  async updateMe(input: UpdateDoctorInput): Promise<DoctorProfile> {
    return apiRequest<DoctorProfile>('/doctors/me', {
      method: 'PATCH',
      auth: true,
      body: input,
    });
  },
};
