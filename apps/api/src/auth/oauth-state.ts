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

export function isAllowedAppRedirect(uri: string): boolean {
  return ALLOWED_REDIRECT_PREFIXES.some((p) => uri.startsWith(p));
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
