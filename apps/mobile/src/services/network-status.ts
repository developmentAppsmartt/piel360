import { getApiBaseUrl } from '../config/env';

export const OFFLINE_MESSAGE =
  'Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.';

type Listener = (offline: boolean) => void;

const listeners = new Set<Listener>();
let offline = false;

function setOffline(next: boolean) {
  if (offline === next) return;
  offline = next;
  listeners.forEach((listener) => listener(offline));
}

export function isOffline(): boolean {
  return offline;
}

export function subscribeNetworkStatus(listener: Listener): () => void {
  listeners.add(listener);
  listener(offline);
  return () => {
    listeners.delete(listener);
  };
}

export function reportNetworkFailure() {
  setOffline(true);
}

export function reportNetworkSuccess() {
  setOffline(false);
}

/** Cualquier respuesta HTTP (incluso 404) significa que hay red y API. */
export async function checkConnectivity(timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`${getApiBaseUrl()}/app-config`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-Client': 'mobile' },
      signal: controller.signal,
    });
    reportNetworkSuccess();
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
