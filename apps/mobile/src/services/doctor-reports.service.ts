import { apiRequest } from './api.client';
import type {
  DoctorReportsFilters,
  LifestyleReport,
  SkinHealthReport,
} from '../types/skin-report';

function toQuery(filters: DoctorReportsFilters): string {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  if (filters.trendMonths != null) {
    params.set('trendMonths', String(filters.trendMonths));
  }
  if (filters.professionalUserId) {
    params.set('professionalUserId', filters.professionalUserId);
  }
  return params.toString();
}

export const doctorReportsService = {
  async getSkinHealth(
    filters: DoctorReportsFilters,
  ): Promise<SkinHealthReport> {
    const qs = toQuery(filters);
    return apiRequest<SkinHealthReport>(
      `/doctor/reports/skin-health?${qs}`,
      { auth: true },
    );
  },

  async getLifestyle(
    filters: DoctorReportsFilters,
  ): Promise<LifestyleReport> {
    const qs = toQuery(filters);
    return apiRequest<LifestyleReport>(`/doctor/reports/lifestyle?${qs}`, {
      auth: true,
    });
  },
};
