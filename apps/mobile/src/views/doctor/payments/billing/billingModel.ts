import { Icons } from '../../../../components/icons';
import { toAnalysisProviderSlug } from '../../../../data/analysisProviderLabel';
import type { Subscription } from '../../../../types/subscription';

export const SUPPORT_EMAIL = 'soporte@piel360.com';
export const PLANS_WEB_URL = 'https://piel360.com/doctor/planes';
export const BILLING_WINDOW_DAYS = 30;

export type BillingCategory = 'active' | 'consumed' | 'cancelled';
export type BillingFilter = 'all' | BillingCategory;
export type BillingSort = 'recent' | 'endsAt' | 'name';

export const CATEGORY_THEME: Record<
  BillingCategory,
  { fg: string; bg: string; border: string; bar: string }
> = {
  active: { fg: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', bar: '#22C55E' },
  consumed: { fg: '#B45309', bg: '#FFFBEB', border: '#FDE68A', bar: '#F59E0B' },
  cancelled: { fg: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', bar: '#EF4444' },
};

export const CATEGORY_SECTION: Record<
  BillingCategory,
  { title: string; hint: string; summary: string; summaryHint: string }
> = {
  active: {
    title: 'Planes activos',
    hint: '(con créditos disponibles)',
    summary: 'Planes activos',
    summaryHint: 'Con créditos disponibles',
  },
  consumed: {
    title: 'Planes consumidos',
    hint: '(sin créditos o vencidos)',
    summary: 'Planes consumidos',
    summaryHint: 'Sin créditos disponibles',
  },
  cancelled: {
    title: 'Planes cancelados / Pendientes',
    hint: '',
    summary: 'Planes cancelados / pendientes',
    summaryHint: 'No disponible',
  },
};

export const FILTER_LABEL: Record<BillingFilter, string> = {
  all: 'Todos los planes',
  active: 'Activos',
  consumed: 'Consumidos',
  cancelled: 'Cancelados / Pendientes',
};

export function isExpired(sub: Subscription, now = Date.now()): boolean {
  if (!sub.endsAt) return false;
  const ends = new Date(sub.endsAt).getTime();
  return Number.isFinite(ends) && ends <= now;
}

export function billingCategory(
  sub: Subscription,
  now = Date.now(),
): BillingCategory {
  if (sub.status !== 'active') return 'cancelled';
  if (sub.remainingCredits <= 0 || isExpired(sub, now)) return 'consumed';
  return 'active';
}

export function statusPillLabel(sub: Subscription, now = Date.now()): string {
  const category = billingCategory(sub, now);
  if (category === 'active') return 'Activo';
  if (category === 'consumed') {
    return sub.remainingCredits > 0 ? 'Vencido' : 'Consumido';
  }
  return sub.status === 'pending' ? 'Pendiente' : 'Cancelado';
}

/** Créditos que se muestran: un plan cancelado/pendiente no tiene saldo usable. */
export function creditsOf(sub: Subscription): { left: number; total: number; pct: number } {
  const total = Math.max(sub.plan.analysisLimit, 0);
  const left =
    sub.status === 'active' ? Math.min(Math.max(sub.remainingCredits, 0), total) : 0;
  const pct = total > 0 ? Math.round((left / total) * 100) : 0;
  return { left, total, pct };
}

type PlanKind = 'both' | 'derm' | 'aesthetic' | 'fototipo' | 'other';

function planKind(sub: Subscription): PlanKind {
  const limits = sub.plan.analysisLimits ?? {};
  const derm = (limits.skiniver ?? 0) > 0;
  const aesthetic = (limits.aesthetic ?? 0) > 0;
  if (derm && aesthetic) return 'both';
  if (derm) return 'derm';
  if (aesthetic) return 'aesthetic';
  const slug = toAnalysisProviderSlug(sub.plan.provider.slug);
  if (slug === 'skiniver') return 'derm';
  if (slug === 'youcam') return 'aesthetic';
  if (slug === 'fitzpatrick') return 'fototipo';
  return 'other';
}

export function planSubtitle(sub: Subscription): string {
  switch (planKind(sub)) {
    case 'both':
      return 'Análisis estético + dermatológico';
    case 'derm':
      return 'Análisis dermatológico';
    case 'aesthetic':
      return 'Análisis estético';
    case 'fototipo':
      return 'Análisis de fototipo';
    default:
      return sub.plan.provider.displayLabel?.trim() || 'Plan de análisis';
  }
}

export function planIcon(sub: Subscription) {
  switch (planKind(sub)) {
    case 'derm':
      return Icons.dermAnalysis;
    case 'aesthetic':
      return Icons.aesthetic;
    case 'fototipo':
      return Icons.fototipo;
    default:
      return Icons.skin;
  }
}

export function planIncludes(sub: Subscription): string {
  const description = sub.plan.description?.trim();
  if (description) return description;
  const features = (sub.plan.features ?? [])
    .filter((f) => f.included)
    .map((f) => f.label);
  if (features.length > 0) return features.join(' · ');
  return planSubtitle(sub);
}

/** Valor cobrado: factura interna (con IVA) o precio del plan. */
export function amountPaid(sub: Subscription): number {
  const raw = sub.invoice?.grossAmount ?? sub.plan.customerPrice ?? sub.plan.price;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function purchaseDate(sub: Subscription): string {
  return sub.invoice?.createdAt ?? sub.createdAt;
}

/** Fecha que acompaña la card según el estado. */
export function cardDate(sub: Subscription): { label: string; iso: string | null } {
  if (sub.status === 'cancelled') {
    return { label: 'Fecha de cancelación', iso: sub.updatedAt ?? sub.createdAt };
  }
  if (sub.status === 'pending') {
    return { label: 'Fecha de compra', iso: sub.createdAt };
  }
  return { label: 'Vigencia', iso: sub.endsAt };
}

export function billedInWindow(subs: Subscription[], now = Date.now()): number {
  const from = now - BILLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return subs
    .filter((s) => s.status === 'active')
    .filter((s) => {
      const t = new Date(purchaseDate(s)).getTime();
      return Number.isFinite(t) && t >= from && t <= now;
    })
    .reduce((sum, s) => sum + amountPaid(s), 0);
}

export function sortSubscriptions(
  subs: Subscription[],
  sort: BillingSort,
): Subscription[] {
  const copy = [...subs];
  if (sort === 'name') {
    return copy.sort((a, b) => a.plan.name.localeCompare(b.plan.name, 'es'));
  }
  if (sort === 'endsAt') {
    const time = (s: Subscription) =>
      s.endsAt ? new Date(s.endsAt).getTime() : Number.POSITIVE_INFINITY;
    return copy.sort((a, b) => time(a) - time(b));
  }
  return copy.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function formatCop(value: number): string {
  const rounded = Math.round(value);
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${rounded < 0 ? '-' : ''}$ ${digits}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "Hoy, 25 abr 2026" / "24 abr 2026". */
export function formatUpdated(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const label = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return d.toDateString() === new Date().toDateString() ? `Hoy, ${label}` : label;
}
