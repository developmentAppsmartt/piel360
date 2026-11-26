/** Filtros y exportación del reporte de referidos. Sin React. */
import { colombiaDateKey } from "@piel360/shared";
import { normalizeText } from "@/lib/normalize-text";

/** Una fila por compra del referido (o una sin plan si aún no compra). */
export type ReferralReportRow = {
  id: string;
  organization: { id: string; name: string };
  code: string;
  professional: { name: string; email: string };
  specialty: string | null;
  planName: string | null;
  commissionPercent: number | null;
  commissionValue: number;
  date: string;
};

export type ReferralFilters = {
  organization: string;
  professional: string;
  plan: string;
  /** Día exacto (AAAA-MM-DD, día de Colombia). */
  day: string;
  from: string;
  to: string;
  specialty: string;
};

export const EMPTY_FILTERS: ReferralFilters = {
  organization: "",
  professional: "",
  plan: "",
  day: "",
  from: "",
  to: "",
  specialty: "",
};

export function hasFilters(filters: ReferralFilters): boolean {
  return Object.values(filters).some((value) => value.trim() !== "");
}

const contains = (value: string | null | undefined, query: string) =>
  !query.trim() || normalizeText(value ?? "").includes(normalizeText(query.trim()));

export function matchesReferral(row: ReferralReportRow, f: ReferralFilters): boolean {
  // Días de Colombia: una compra de las 21:00 de Bogotá no cae al día siguiente.
  const day = colombiaDateKey(new Date(row.date));
  return (
    contains(row.organization.name, f.organization) &&
    (contains(row.professional.name, f.professional) ||
      contains(row.professional.email, f.professional)) &&
    contains(row.planName, f.plan) &&
    (!f.day || day === f.day) &&
    (!f.from || day >= f.from) &&
    (!f.to || day <= f.to) &&
    (!f.specialty || row.specialty === f.specialty)
  );
}

/** Las especialidades que aparecen en el reporte (no hay un catálogo). */
export function specialtyOptions(rows: ReferralReportRow[]): string[] {
  return [...new Set(rows.map((r) => r.specialty).filter((s): s is string => !!s))].sort(
    (a, b) => a.localeCompare(b, "es"),
  );
}

export function referralCsvRows(
  rows: ReferralReportRow[],
  withOrganization: boolean,
): (string | number | null)[][] {
  const header = [
    ...(withOrganization ? ["Empresa aliada"] : []),
    "Código",
    "Profesional",
    "Correo",
    "Nombre plan",
    "Especialidad",
    "% Comisión",
    "Valor comisión (COP)",
    "Fecha",
  ];
  return [
    header,
    ...rows.map((r) => [
      ...(withOrganization ? [r.organization.name] : []),
      r.code,
      r.professional.name,
      r.professional.email,
      r.planName ?? "",
      r.specialty ?? "",
      r.commissionPercent,
      Math.round(r.commissionValue),
      colombiaDateKey(new Date(r.date)),
    ]),
  ];
}
