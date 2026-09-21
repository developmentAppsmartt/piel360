import { getApiBaseUrl } from '../config/env';
import { emitSessionEnded, SESSION_REPLACED } from './session-events';
import { storageService } from './storage.service';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  /** Si true, no fuerza Content-Type JSON (útil para FormData). */
  formData?: boolean;
};

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const record = body as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message;
  if (Array.isArray(record.message) && record.message.every((m) => typeof m === 'string')) {
    return record.message.join('. ');
  }
  return fallback;
}

/** Refresh compartido: si varias peticiones dan 401 a la vez, todas esperan
 * el mismo intento en vez de disparar uno cada una. */
let refreshInFlight: Promise<boolean> | null = null;

/** Se hace con `fetch` directo (no con authService) para no crear un ciclo
 * de imports: auth.service depende de este archivo. */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await storageService.getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client': 'mobile',
      },
      body: JSON.stringify({ refreshToken }),
    });
    const parsed = (await res.json().catch(() => null)) as {
      accessToken?: string;
      refreshToken?: string;
      user?: unknown;
      code?: string;
    } | null;

    if (!res.ok || !parsed?.accessToken || !parsed.refreshToken) {
      emitSessionEnded(parsed?.code === SESSION_REPLACED ? 'replaced' : 'expired');
      return false;
    }

    await storageService.saveSession({
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      user: parsed.user as Parameters<typeof storageService.saveSession>[0]['user'],
    });
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, formData = false } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined && !formData) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = await storageService.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // El backend usa X-Client para saber qué cupo de sesión ocupa el login
  // (los profesionales tienen uno web y otro móvil).
  headers['X-Client'] = 'mobile';

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const send = async (): Promise<Response> => {
    try {
      return await fetch(url, {
        method,
        headers,
        body:
          body === undefined
            ? undefined
            : formData
              ? (body as FormData)
              : JSON.stringify(body),
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new ApiError(
        `No se pudo conectar con ${baseUrl} (${detail}). Si usas un APK, recompílalo con EXPO_PUBLIC_API_URL de producción.`,
        0,
      );
    }
  };

  let response = await send();

  // Access token vencido: se renueva una vez y se reintenta. En /auth/* un
  // 401 es credencial inválida, no sesión vencida.
  if (response.status === 401 && auth && !path.startsWith('/auth/')) {
    if (await refreshOnce()) {
      const token = await storageService.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      response = await send();
    }
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    // 401 que sobrevive al refresh: la sesión ya no sirve (la cerró otro
    // login o venció el refresh) — hay que sacar al usuario al login.
    if (response.status === 401 && auth && !path.startsWith('/auth/')) {
      const code = (parsed as { code?: string } | null)?.code;
      emitSessionEnded(code === SESSION_REPLACED ? 'replaced' : 'expired');
    }
    throw new ApiError(
      messageFromBody(parsed, `Error ${response.status}`),
      response.status,
      parsed,
    );
  }

  return parsed as T;
}
