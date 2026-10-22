import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getApiBaseUrl } from '../config/env';
import {
  DEFAULT_BRANDING,
  type AppBranding,
} from '../config/branding.defaults';
import { apiRequest } from './api.client';

/** Respuesta de la API (`AccountBranding` en @piel360/shared). */
export type RemoteBranding = {
  publicId: string | null;
  colors: {
    background?: string;
    primary: string;
    /** Ausente si la API es anterior a este campo. */
    primaryText?: string;
    secondaryText?: string;
    icon?: string;
    secondary: string;
    button: string;
    buttonHover?: string;
    gradientStart: string;
    gradientEnd: string;
    gradientHoverStart?: string;
    gradientHoverEnd?: string;
    buttonText?: string;
    gradientText?: string;
    link?: string;
    loginText?: string;
    menuBackground?: string;
  };
  loginBackgroundUrl: string | null;
  loginLogoUrl: string | null;
  loginOverlay?: boolean;
};

/**
 * Se guarda en archivo (no en SecureStore: las URLs firmadas superan su
 * límite de 2 KB) para que el login, antes de iniciar sesión, ya muestre la
 * marca del último profesional o empresa con el que se usó la app.
 */
const CACHE_KEY = 'piel360_branding';
const CACHE_FILE = `${FileSystem.documentDirectory ?? ''}${CACHE_KEY}.json`;

async function readCache(): Promise<RemoteBranding | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(CACHE_KEY) ?? null
        : (await FileSystem.getInfoAsync(CACHE_FILE)).exists
          ? await FileSystem.readAsStringAsync(CACHE_FILE)
          : null;
    return raw ? (JSON.parse(raw) as RemoteBranding) : null;
  } catch {
    return null;
  }
}

async function writeCache(remote: RemoteBranding): Promise<void> {
  const raw = JSON.stringify(remote);
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(CACHE_KEY, raw);
      return;
    }
    await FileSystem.writeAsStringAsync(CACHE_FILE, raw);
  } catch {
    // Sin caché el login usa el branding por defecto; no es crítico.
  }
}

/** `amount` < 0 oscurece hacia negro; > 0 aclara hacia blanco. */
function shade(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const channel = (start: number) => {
    const c = parseInt(value.slice(start, start + 2), 16);
    const next = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.round(next).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

export function toAppBranding(remote: RemoteBranding | null): AppBranding {
  if (!remote) return DEFAULT_BRANDING;
  const { colors } = remote;
  const iconCustomized =
    colors.icon != null &&
    colors.icon.toUpperCase() !== DEFAULT_BRANDING.colors.icon.toUpperCase();
  const isDefaultPrimary =
    colors.primary.toUpperCase() === DEFAULT_BRANDING.colors.primary.toUpperCase();
  return {
    ...DEFAULT_BRANDING,
    colors: {
      ...DEFAULT_BRANDING.colors,
      screenBackground: colors.background ?? null,
      primary: colors.primary,
      primaryDark: isDefaultPrimary
        ? DEFAULT_BRANDING.colors.primaryDark
        : shade(colors.primary, -0.3),
      primaryText: colors.primaryText ?? DEFAULT_BRANDING.colors.primaryText,
      secondaryText:
        colors.secondaryText ?? DEFAULT_BRANDING.colors.secondaryText,
      secondaryTextOverride:
        colors.secondaryText != null &&
        colors.secondaryText.toUpperCase() !==
          DEFAULT_BRANDING.colors.secondaryText.toUpperCase()
          ? colors.secondaryText
          : null,
      icon: colors.icon ?? DEFAULT_BRANDING.colors.icon,
      iconMuted: iconCustomized ? colors.icon! : DEFAULT_BRANDING.colors.iconMuted,
      iconOnHeader: iconCustomized
        ? colors.icon!
        : DEFAULT_BRANDING.colors.iconOnHeader,
      // Tono claro del primario (chips, fondos suaves, botones secundarios).
      secondary: isDefaultPrimary
        ? DEFAULT_BRANDING.colors.secondary
        : shade(colors.primary, 0.25),
      button: colors.button,
      buttonHover: colors.buttonHover ?? DEFAULT_BRANDING.colors.buttonHover,
      buttonGradient: [colors.gradientStart, colors.gradientEnd],
      buttonGradientHover: [
        colors.gradientHoverStart ?? DEFAULT_BRANDING.colors.buttonGradientHover[0],
        colors.gradientHoverEnd ?? DEFAULT_BRANDING.colors.buttonGradientHover[1],
      ],
      buttonText: colors.buttonText ?? DEFAULT_BRANDING.colors.buttonText,
      buttonGradientText:
        colors.gradientText ?? DEFAULT_BRANDING.colors.buttonGradientText,
      loginAccent: colors.secondary,
      links: colors.link ?? DEFAULT_BRANDING.colors.links,
      menuBackground:
        colors.menuBackground ?? DEFAULT_BRANDING.colors.menuBackground,
      loginTextOverride:
        colors.loginText != null && colors.loginText.toUpperCase() !== "#FFFFFF"
          ? colors.loginText
          : null,
    },
    loginHeroImage: remote.loginBackgroundUrl
      ? { uri: remote.loginBackgroundUrl }
      : DEFAULT_BRANDING.loginHeroImage,
    loginLogoImage: remote.loginLogoUrl
      ? { uri: remote.loginLogoUrl }
      : DEFAULT_BRANDING.loginLogoImage,
    companyLogoImage: remote.loginLogoUrl ? { uri: remote.loginLogoUrl } : null,
    loginOverlay: remote.loginOverlay ?? true,
  };
}

export const brandingService = {
  getDefaults(): AppBranding {
    return DEFAULT_BRANDING;
  },

  readCache,

  /** Renueva el branding cacheado sin sesión (URLs firmadas frescas). */
  async refreshCached(): Promise<RemoteBranding | null> {
    const cached = await readCache();
    if (!cached?.publicId) return cached;
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/public/branding/${encodeURIComponent(cached.publicId)}`,
        { headers: { Accept: 'application/json', 'X-Client': 'mobile' } },
      );
      if (!res.ok) return cached;
      const fresh = (await res.json()) as RemoteBranding;
      await writeCache(fresh);
      return fresh;
    } catch {
      return cached;
    }
  },

  /** Branding que hereda el usuario autenticado (propio, de su empresa o de su profesional). */
  async fetchForSession(): Promise<RemoteBranding> {
    const fresh = await apiRequest<RemoteBranding>('/auth/me/branding', {
      auth: true,
    });
    await writeCache(fresh);
    return fresh;
  },
};
