import { apiRequest } from './api.client';
import {
  CLINICAL_SIDE_MODULES,
  filterVisibleClinicalModules,
  type ClinicalSideModuleId,
} from '../lib/clinical-side-modules';

export type ClinicalSideModule = {
  id: ClinicalSideModuleId;
  slug: string;
  label: string;
};

export const clinicalModulesService = {
  async listForMenu(): Promise<ClinicalSideModule[]> {
    try {
      const result = await apiRequest<{ permissions: string[] }>(
        '/auth/me/permissions',
        { method: 'GET', auth: true },
      );
      const visible = filterVisibleClinicalModules(result.permissions);
      if (visible.length > 0) {
        return visible.map((m) => ({
          id: m.id,
          slug: m.slug,
          label: m.label,
        }));
      }
    } catch {
      /* fallback abajo */
    }
    // Si el token no trae slugs clínicos aún, mostrar el menú CRM completo
    // (el API validará al entrar a cada módulo).
    return CLINICAL_SIDE_MODULES.map((m) => ({
      id: m.id,
      slug: m.slug,
      label: m.label,
    }));
  },
};
