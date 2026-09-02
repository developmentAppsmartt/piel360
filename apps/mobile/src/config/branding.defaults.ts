import type { ImageSourcePropType } from 'react-native';

/**
 * Branding estático de la app.
 * El backoffice podrá sobreescribir colores e imagen de login vía API;
 * `branding.service` ya expone la misma forma.
 *
 * Regla: acentos de UI (botones, headers, tabs activos, switches, avatares)
 * deben usar `colors.primary` / `primaryDark` — no hardcodear otra marca.
 */
export type AppBranding = {
  appName: string;
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    text: string;
    textOnDark: string;
    muted: string;
    error: string;
    success: string;
    inputBackground: string;
    overlay: string;
  };
  /** Imagen full-bleed del login (asset local o URI remota en el futuro). */
  loginHeroImage: ImageSourcePropType;
  /** Logo horizontal (PNG con fondo transparente). */
  logoImage: ImageSourcePropType;
};

export const DEFAULT_BRANDING: AppBranding = {
  appName: 'Piel360',
  colors: {
    primary: '#1E5A9E',
    primaryDark: '#0F3D73',
    secondary: '#3B82C4',
    text: '#1A1A1A',
    textOnDark: '#FFFFFF',
    muted: '#6B7280',
    error: '#DC2626',
    success: '#16A34A',
    inputBackground: 'rgba(255,255,255,0.94)',
    overlay: 'rgba(11, 10, 18, 0.55)',
  },
  loginHeroImage: require('../../assets/login.png'),
  logoImage: require('../../assets/logo-piel360.png'),
};
