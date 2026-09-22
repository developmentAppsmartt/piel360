/** Helpers de referidos para empresas aliadas. */

export function slugifyAlliedOrgName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'empresa-aliada';
}

/** Ruta relativa al registro (profesional o empresa) con código de empresa aliada. */
export function buildAlliedReferralPath(slug: string, referralCode: string): string {
  const safeSlug = encodeURIComponent(slug.trim());
  const safeCode = encodeURIComponent(referralCode.trim());
  return `/doctor/register?aliada=${safeSlug}&ref=${safeCode}`;
}

export function buildAlliedReferralUrl(
  frontendBaseUrl: string,
  slug: string,
  referralCode: string,
): string {
  const base = frontendBaseUrl.replace(/\/$/, '');
  return `${base}${buildAlliedReferralPath(slug, referralCode)}`;
}
