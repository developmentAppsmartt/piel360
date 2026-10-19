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

export function isRecaptchaNativeReady(): boolean {
  return RECAPTCHA_ENABLED && Boolean(recaptchaSiteKeyForPlatform());
}
