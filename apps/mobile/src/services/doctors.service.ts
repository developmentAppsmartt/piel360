import { apiRequest } from './api.client';

export type DoctorProfile = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  zip: string | null;
  createdAt: string;
  updatedAt: string;
};

export const doctorsService = {
  async getMe(): Promise<DoctorProfile> {
    return apiRequest<DoctorProfile>('/doctors/me', { auth: true });
  },
};
