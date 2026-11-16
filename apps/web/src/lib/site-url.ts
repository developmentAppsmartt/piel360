/**
 * URL pública del web, para Open Graph, el sitemap y el JSON-LD.
 * `NEXT_PUBLIC_SITE_URL` si se fija en Vercel; si no, el dominio de
 * producción que Vercel expone solo (`VERCEL_PROJECT_PRODUCTION_URL`, sin
 * protocolo).
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3001";
}
