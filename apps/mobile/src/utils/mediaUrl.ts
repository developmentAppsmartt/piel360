import { getApiBaseUrl } from '../config/env';

/**
 * Reescribe URLs de medios servidas como localhost para que el dispositivo
 * (Expo) pueda cargarlas vía la IP del packager / EXPO_PUBLIC_API_URL.
 */
export function resolveMediaUrl(
  url: string | null | undefined,
): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed)) {
    return trimmed;
  }
  const apiBase = getApiBaseUrl().replace(/\/$/, '');
  const origin = apiBase.replace(/\/api$/i, '');
  return trimmed.replace(
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
    origin,
  );
}
