import type { ImageSourcePropType } from 'react-native';

/**
 * Branding de la app. El profesional o empresa lo personaliza en el CRM
 * (Configuración → Personalización → Identidad corporativa); `BrandingContext`
 * fusiona esa configuración sobre estos valores por defecto.
 *
 * Regla: acentos de UI (headers, títulos, tabs activos, switches, avatares)
 * usan `colors.primary` / `primaryDark`; los botones usan `colors.button` —
 * no hardcodear otra marca.
 */
export type AppBranding = {
  appName: string;
  colors: {
    /** Fondo de las vistas solo si la empresa lo personalizó; si no, cada vista conserva el suyo. */
    screenBackground: string | null;
    /** Letra del login y del registro que no es título; solo si la empresa la personalizó. */
    loginTextOverride: string | null;
    /** Fondo del menú inferior de módulos. */
    menuBackground: string;
    primary: string;
    primaryDark: string;
    /** Títulos y valores destacados (azul o negro). */
    primaryText: string;
    /** Texto general (párrafos, descripciones, datos). */
    secondaryText: string;
    /** `secondaryText` solo si la empresa lo personalizó; si no, cada texto gris conserva el suyo. */
    secondaryTextOverride: string | null;
    /** Iconos del sistema. */
    icon: string;
    /** Iconos grises; toman `icon` si la empresa lo personalizó. */
    iconMuted: string;
    /** Iconos del header; toman `icon` si la empresa lo personalizó. */
    iconOnHeader: string;
    secondary: string;
    /** Fondo de los botones. */
    button: string;
    /** Fondo de los botones al presionar. */
    buttonHover: string;
    /** Inicio y fin de los botones con degradado. */
    buttonGradient: readonly [string, string];
    /** Degradado de los botones al presionar. */
    buttonGradientHover: readonly [string, string];
    /** Texto de los botones generales. */
    buttonText: string;
    /** Texto de los botones con degradado. */
    buttonGradientText: string;
    /** Acento de textos y enlaces del login. */
    loginAccent: string;
    links: string;
    text: string;
    textOnDark: string;
    muted: string;
    error: string;
    success: string;
    inputBackground: string;
    overlay: string;
  };
  /** Imagen full-bleed del login (asset local o URL remota). */
  loginHeroImage: ImageSourcePropType;
  /** Logo de la pantalla de login (personalizable). */
  loginLogoImage: ImageSourcePropType;
  /** Logo de la empresa o profesional; solo si lo subió en el CRM. */
  companyLogoImage: ImageSourcePropType | null;
  /** Degradado oscuro del login sobre la imagen de fondo (se puede quitar en el CRM). */
  loginOverlay: boolean;
  /** Logo completo (pantallas de marca); no se personaliza. */
  logoImage: ImageSourcePropType;
  /** Logo horizontal blanco para headers de la app. */
  headerLogoImage: ImageSourcePropType;
};

const DEFAULT_LOGO = require('../../assets/logo-piel360.png');

export const DEFAULT_BRANDING: AppBranding = {
  appName: 'Piel360',
  colors: {
    screenBackground: null,
    primary: '#1E5A9E',
    primaryDark: '#0F3D73',
    primaryText: '#1E5A9E',
    secondaryText: '#1A1A1A',
    secondaryTextOverride: null,
    loginTextOverride: null,
    menuBackground: '#FFFFFF',
    icon: '#1E5A9E',
    iconMuted: '#6B7280',
    iconOnHeader: '#FFFFFF',
    secondary: '#3B82C4',
    button: '#1E5A9E',
    buttonHover: '#1A2B5E',
    buttonGradient: ['#1E5A9E', '#2DD4BF'],
    buttonGradientHover: ['#1A2B5E', '#2DD4BF'],
    buttonText: '#FFFFFF',
    buttonGradientText: '#FFFFFF',
    loginAccent: '#2DD4BF',
    text: '#1A1A1A',
    textOnDark: '#FFFFFF',
    muted: '#6B7280',
    error: '#DC2626',
    success: '#16A34A',
    inputBackground: 'rgba(255,255,255,0.94)',
    links: '#2DD4BF',
    overlay: 'rgba(11, 10, 18, 0.55)',
  },
  loginHeroImage: require('../../assets/login.png'),
  loginLogoImage: DEFAULT_LOGO,
  companyLogoImage: null,
  loginOverlay: true,
  logoImage: DEFAULT_LOGO,
  headerLogoImage: require('../../assets/logo-headers.png'),
};
