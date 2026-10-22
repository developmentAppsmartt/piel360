import type { ConfigService } from '@nestjs/config';

/** Solo los banners del editor de plantillas: la ruta pública no puede servir
 * para leer otros archivos del bucket (análisis, avatares…). */
const KEY_DE_BANNER = /^email-templates\/[^/]+\/banners\/[^/]+$/;

/** Una URL firmada de S3 (o R2) que apunta a un banner. La key sigue en el
 * path aunque la firma ya haya caducado, así que se puede recuperar. */
const URL_FIRMADA_DE_BANNER =
  /https?:\/\/[^\s"'<>]*?\/(email-templates\/[^\s"'<>?/]+\/banners\/[^\s"'<>?/]+)\?[^\s"'<>]*X-Amz-[^\s"'<>]*/g;

export function esKeyDeBanner(key: string): boolean {
  return KEY_DE_BANNER.test(key) && !key.includes('..');
}

/** Base pública del API, la misma que usa el link del reporte. */
export function baseApiPublica(config: ConfigService): string {
  return (
    config.get<string>('PUBLIC_API_URL') ??
    config.getOrThrow<string>('FRONTEND_URL')
  ).replace(/\/$/, '');
}

/**
 * La URL que se guarda en el `<img src>`. No caduca: el API la redirige a una
 * firma nueva en cada petición. Antes se guardaba la firmada, que SigV4 limita
 * a 7 días, y al octavo el banner se rompía en todos los correos.
 */
export function urlPublicaDeBanner(base: string, key: string): string {
  const path = key.split('/').map(encodeURIComponent).join('/');
  return `${base}/api/public/email-assets/${path}`;
}

/** Cambia las URLs firmadas de banners que ya estaban guardadas por la
 * estable. Lo que no sea un banner se queda como está. */
export function conBannersEstables(html: string, base: string): string {
  return html.replace(
    URL_FIRMADA_DE_BANNER,
    (original, keyCodificada: string) => {
      let key: string;
      try {
        key = decodeURIComponent(keyCodificada);
      } catch {
        return original;
      }
      return esKeyDeBanner(key) ? urlPublicaDeBanner(base, key) : original;
    },
  );
}
