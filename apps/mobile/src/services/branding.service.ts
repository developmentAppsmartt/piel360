import {
  DEFAULT_BRANDING,
  type AppBranding,
} from '../config/branding.defaults';

/**
 * Hoy devuelve el branding estático.
 * Cuando el backoffice exponga la config, este servicio hará GET al API
 * y mapeará colores + URL de imagen de login a `AppBranding`.
 */
export const brandingService = {
  async getBranding(): Promise<AppBranding> {
    // TODO: GET /mobile/branding (o similar) y fusionar con DEFAULT_BRANDING
    return DEFAULT_BRANDING;
  },

  getDefaults(): AppBranding {
    return DEFAULT_BRANDING;
  },
};
