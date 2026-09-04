/** State OAuth: `role.platform` o `role.platform.redirectUri` (URI encodeado). */

export type OAuthPlatform = 'web' | 'mobile';

export type OAuthState = {
  role: string | undefined;
  platform: OAuthPlatform;
  /** URI final tras el callback (deep link mobile o origin Expo web). */
  redirectUri?: string;
};

const ALLOWED_REDIRECT_PREFIXES = [
  'piel360://',
  'exp://',
  'exps://',
  'http://localhost',
  'http://127.0.0.1',
  'https://localhost',
  'https://127.0.0.1',
] as const;

/** LAN típica de Expo web / Metro (p. ej. http://192.168.x.x:8081). */
const LAN_HTTP_RE =
  /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?(\/|$)/i;

export function isAllowedAppRedirect(uri: string): boolean {
  if (ALLOWED_REDIRECT_PREFIXES.some((p) => uri.startsWith(p))) return true;
  return LAN_HTTP_RE.test(uri);
}

/** @deprecated Prefer isAllowedAppRedirect */
export const isAllowedMobileRedirect = isAllowedAppRedirect;

export function encodeOAuthState(
  role: string | undefined,
  platform: OAuthPlatform = 'web',
  redirectUri?: string,
): string {
  const r = role === 'doctor' ? 'doctor' : 'patient';
  if (redirectUri && isAllowedAppRedirect(redirectUri)) {
    return `${r}.${platform}.${encodeURIComponent(redirectUri)}`;
  }
  return `${r}.${platform}`;
}

export function parseOAuthState(state: unknown): OAuthState {
  if (typeof state !== 'string' || !state.trim()) {
    return { role: undefined, platform: 'web' };
  }
  const raw = state.trim();
  if (!raw.includes('.')) {
    return { role: raw, platform: 'web' };
  }
  const [role, platformRaw, ...rest] = raw.split('.');
  const platform: OAuthPlatform = platformRaw === 'mobile' ? 'mobile' : 'web';
  if (rest.length > 0) {
    const redirectUri = decodeURIComponent(rest.join('.'));
    return {
      role: role || undefined,
      platform,
      redirectUri: isAllowedAppRedirect(redirectUri) ? redirectUri : undefined,
    };
  }
  return {
    role: role || undefined,
    platform,
  };
}
