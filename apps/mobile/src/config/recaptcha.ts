import { Platform } from 'react-native';

/**
 * reCAPTCHA Enterprise Mobile SDK (Android / iOS).
 * Sin casilla: fetchClient + execute(LOGIN|SIGNUP).
 * @see https://docs.cloud.google.com/recaptcha/docs/instrument-android-apps#react-native
 *
 * Requiere keys de plataforma (no las de web):
 *   EXPO_PUBLIC_RECAPTCHA_ANDROID_SITE_KEY
 *   EXPO_PUBLIC_RECAPTCHA_IOS_SITE_KEY
 * Y un build nativo (no Expo Go).
 */
export const RECAPTCHA_ENABLED =
  process.env.EXPO_PUBLIC_RECAPTCHA_ENABLED?.trim().toLowerCase() === 'true';

export const RECAPTCHA_ANDROID_SITE_KEY =
  process.env.EXPO_PUBLIC_RECAPTCHA_ANDROID_SITE_KEY?.trim() ?? '';

export const RECAPTCHA_IOS_SITE_KEY =
  process.env.EXPO_PUBLIC_RECAPTCHA_IOS_SITE_KEY?.trim() ?? '';

/** Site key de la plataforma actual. */
export function recaptchaSiteKeyForPlatform(): string {
  if (Platform.OS === 'ios') return RECAPTCHA_IOS_SITE_KEY;
  if (Platform.OS === 'android') return RECAPTCHA_ANDROID_SITE_KEY;
  return '';
}

function apiLocal(): boolean {
  const url = (process.env.EXPO_PUBLIC_API_URL ?? '').toLowerCase();
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('10.0.2.2') ||
    /https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(url)
  );
}

export function isRecaptchaNativeReady(): boolean {
  // Desarrollo o API local: no pedir token. Un APK release contra
  // api.piel360.com sigue verificando.
  if (__DEV__ || apiLocal()) return false;
  return RECAPTCHA_ENABLED && Boolean(recaptchaSiteKeyForPlatform());
}
