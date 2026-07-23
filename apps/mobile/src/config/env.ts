import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Host del packager Expo (ej. `192.168.100.236` desde `exp://192.168.100.236:8081`).
 * En dispositivo/emulador, `localhost` no es tu Mac: hay que usar esta IP.
 */
function getExpoDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    (
      Constants as {
        manifest?: { debuggerHost?: string };
      }
    ).manifest?.debuggerHost;

  if (!hostUri) return null;
  const host = hostUri.split(':')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

/**
 * URL base de la API (incluye `/api`).
 *
 * Prioridad:
 * 1. `EXPO_PUBLIC_API_URL` — si apunta a localhost, se reescribe a la IP del Expo host
 *    (o `10.0.2.2` en emulador Android sin host detectable).
 * 2. IP del packager Expo + `:3000/api`
 * 3. Fallbacks localhost / 10.0.2.2
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  const expoHost = getExpoDevHost();

  if (fromEnv) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(fromEnv)) {
      if (expoHost) {
        return fromEnv.replace(
          /^(https?:\/\/)(localhost|127\.0\.0\.1)/i,
          `$1${expoHost}`,
        );
      }
      if (Platform.OS === 'android') {
        return fromEnv.replace(
          /^(https?:\/\/)(localhost|127\.0\.0\.1)/i,
          '$110.0.2.2',
        );
      }
    }
    return fromEnv;
  }

  if (expoHost) {
    return `http://${expoHost}:3000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }

  return 'http://localhost:3000/api';
}
