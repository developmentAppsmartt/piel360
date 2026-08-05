import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { getApiBaseUrl } from '../config/env';
import type { AuthResult, Role } from '../types/auth';
import { MOBILE_ROLES } from '../types/auth';
import { ApiError, apiRequest } from './api.client';
import { storageService } from './storage.service';

WebBrowser.maybeCompleteAuthSession();

const MOBILE_ROLES_MESSAGE =
  'Esta aplicación es para pacientes y doctores. El panel admin está en la web.';

function assertMobileRole(result: AuthResult): AuthResult {
  if (!MOBILE_ROLES.includes(result.user.role)) {
    throw new ApiError(MOBILE_ROLES_MESSAGE, 403, result);
  }
  return result;
}

function extractCodeFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code;
    if (typeof code === 'string' && code.length > 0) return code;
    if (Array.isArray(code) && typeof code[0] === 'string') return code[0];
  } catch {
    // fallback manual
  }
  const match = /[?&]code=([^&#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

async function exchangeCode(code: string): Promise<AuthResult> {
  const exchanged = await apiRequest<AuthResult>('/auth/google/exchange', {
    method: 'POST',
    body: { code },
  });
  const allowed = assertMobileRole(exchanged);
  await storageService.saveSession(allowed);
  return allowed;
}

function buildAuthUrl(
  role: Extract<Role, 'patient' | 'doctor'>,
  redirectUri: string,
  platform: 'mobile' | 'web',
): string {
  return (
    `${getApiBaseUrl()}/auth/google` +
    `?role=${encodeURIComponent(role)}` +
    `&platform=${platform}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`
  );
}

/**
 * En Expo Web el popup de openAuthSessionAsync choca con COOP.
 * Usamos redirect en la misma ventana; al volver, `completeGoogleLoginFromUrl`.
 */
function loginWithGoogleOnWeb(
  role: Extract<Role, 'patient' | 'doctor'>,
): Promise<AuthResult> {
  if (typeof window === 'undefined') {
    return Promise.reject(new ApiError('Google OAuth no disponible', 400));
  }
  const redirectUri = `${window.location.origin}/`;
  const authUrl = buildAuthUrl(role, redirectUri, 'web');
  window.location.assign(authUrl);
  // La página navega fuera; no resolvemos.
  return new Promise(() => {});
}

/**
 * Si la URL actual trae `?code=` (vuelta de OAuth en web), canjea y limpia la URL.
 */
export async function completeGoogleLoginFromUrl(
  url?: string,
): Promise<AuthResult | null> {
  const href =
    url ??
    (Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.href
      : null);
  if (!href) return null;

  const code = extractCodeFromUrl(href);
  if (!code) return null;

  const result = await exchangeCode(code);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const clean = new URL(window.location.href);
    clean.searchParams.delete('code');
    window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash);
  }

  return result;
}

/**
 * Abre el OAuth de Google y canjea el código por JWT.
 * `role` solo aplica a cuentas nuevas (default patient).
 */
export async function loginWithGoogle(
  role: Extract<Role, 'patient' | 'doctor'> = 'patient',
): Promise<AuthResult> {
  if (Platform.OS === 'web') {
    return loginWithGoogleOnWeb(role);
  }

  const redirectUri = Linking.createURL('auth/google/callback');
  const authUrl = buildAuthUrl(role, redirectUri, 'mobile');
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== 'success' || !('url' in result) || !result.url) {
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new ApiError('Inicio con Google cancelado', 499);
    }
    throw new ApiError('No se completó el inicio con Google', 400);
  }

  const code = extractCodeFromUrl(result.url);
  if (!code) {
    throw new ApiError('Google no devolvió un código válido', 400);
  }

  return exchangeCode(code);
}
