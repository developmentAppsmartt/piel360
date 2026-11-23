import { apiRequest } from './api.client';

/** Aceptación de términos y política de datos (pantalla obligatoria). */
export const legalService = {
  async accept(): Promise<void> {
    await apiRequest<{ ok: true }>('/legal/me/accept', {
      method: 'POST',
      auth: true,
      body: { terms: true, privacy: true },
    });
  },
};
