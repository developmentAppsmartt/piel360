import { getApiBaseUrl } from '../config/env';
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

  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : formData
            ? (body as FormData)
            : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Revisa que la API esté en marcha y EXPO_PUBLIC_API_URL.',
      0,
    );
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
    throw new ApiError(
      messageFromBody(parsed, `Error ${response.status}`),
      response.status,
      parsed,
    );
  }

  return parsed as T;
}
