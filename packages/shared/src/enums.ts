/**
 * Espejo del enum `SubscriptionStatus` de prisma/schema.prisma (apps/api).
 * Único origen de verdad para el schema: MIGRACION.md §7.1.
 */
export const SUBSCRIPTION_STATUSES = ["pending", "active", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Nivel de riesgo devuelto por Skiniver en `topn[].risk_level` (INTEGRACIONES-IA.md §1.3). */
export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Roles del sistema (RBAC simplificado, MIGRACION.md §5). */
export const ROLES = ["admin", "doctor", "patient"] as const;
export type Role = (typeof ROLES)[number];
