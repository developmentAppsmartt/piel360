import { NativeModules, Platform } from 'react-native';
import {
  isRecaptchaNativeReady,
  recaptchaSiteKeyForPlatform,
} from '../config/recaptcha';

/**
 * API nativa del módulo (Kotlin). No usamos el JS de Google:
 * en el import fija un Proxy si NativeModules aún está vacío
 * (New Architecture / bridgeless) y luego falla para siempre.
 */
type NativeRecaptcha = {
  fetchClient: (siteKey: string) => Promise<null>;
  execute: (
    action: string,
    args: { timeout?: number },
  ) => Promise<string>;
};

let clientReady: Promise<NativeRecaptcha> | null = null;

function getNativeModule(): NativeRecaptcha | null {
  const mod = NativeModules.RecaptchaEnterpriseReactNative as
    | NativeRecaptcha
    | undefined;
  if (!mod?.fetchClient || !mod?.execute) return null;
  return mod;
}

/** true si el módulo nativo responde (consulta lazy, no en el import). */
export function isRecaptchaSdkLinked(): boolean {
  return getNativeModule() != null;
}

async function getNativeClient(): Promise<NativeRecaptcha> {
  const siteKey = recaptchaSiteKeyForPlatform();
  if (!siteKey) {
    throw new Error(
      Platform.OS === 'ios'
        ? 'Falta EXPO_PUBLIC_RECAPTCHA_IOS_SITE_KEY'
        : 'Falta EXPO_PUBLIC_RECAPTCHA_ANDROID_SITE_KEY',
    );
  }
  const native = getNativeModule();
  if (!native) {
    throw new Error(
      'reCAPTCHA SDK no está en este build. Usa expo run:android (no Expo Go) tras prebuild.',
    );
  }
  if (!clientReady) {
    clientReady = native.fetchClient(siteKey).then(() => native).catch((err) => {
      clientReady = null;
      throw err;
    });
  }
  return clientReady;
}

/**
 * Obtiene un token con el SDK nativo (sin UI).
 * action: LOGIN | REGISTER (REGISTER → signup del SDK).
 */
export async function getRecaptchaToken(
  action: 'LOGIN' | 'REGISTER' = 'LOGIN',
): Promise<string> {
  if (!isRecaptchaNativeReady()) {
    return '';
  }
  try {
    const native = await getNativeClient();
    const actionStr = action === 'REGISTER' ? 'signup' : 'login';
    const token = await native.execute(actionStr, { timeout: 10_000 });
    const trimmed = String(token ?? '').trim();
    if (!trimmed) {
      throw new Error(
        'reCAPTCHA no devolvió token. En la consola Google activa “Admitir apps ajenas a Play Store” para pruebas.',
      );
    }
    if (__DEV__) {
      console.log(`[recaptcha] token ok len=${trimmed.length} action=${actionStr}`);
    }
    return trimmed;
  } catch (err) {
    clientReady = null;
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  }
}

/** Inicializa en segundo plano al arrancar la app (reduce latencia en login). */
export function warmRecaptchaClient(): void {
  if (!isRecaptchaNativeReady()) return;
  void getNativeClient().catch((err) => {
    clientReady = null;
    if (__DEV__) {
      console.warn('[recaptcha] warm falló', err);
    }
  });
}
