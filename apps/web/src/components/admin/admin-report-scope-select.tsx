"use client";

import { useAdminReportScopes } from "@/lib/queries/admin-reports";
import type { DoctorReportsFilters } from "@/lib/queries/doctor-reports";

type Scope = Pick<
  DoctorReportsFilters,
  "organizationId" | "professionalUserId"
>;

function encode(scope: Scope): string {
  if (scope.organizationId) return `org:${scope.organizationId}`;
  if (scope.professionalUserId) return `pro:${scope.professionalUserId}`;
  return "all";
}

function decode(value: string): Scope {
  const [kind, id] = value.split(":");
  if (kind === "org")
    return { organizationId: id, professionalUserId: undefined };
  if (kind === "pro")
    return { organizationId: undefined, professionalUserId: id };
  return { organizationId: undefined, professionalUserId: undefined };
}

/** Toda la plataforma, una empresa (lo que ve su dueño) o un profesional. */
export function AdminReportScopeSelect({
  value,
  onChange,
}: {
  value: Scope;
  onChange: (scope: Scope) => void;
}) {
  const scopes = useAdminReportScopes();
  const organizations = scopes.data?.organizations ?? [];
  const professionals = scopes.data?.professionals ?? [];

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Alcance
      </span>
      <select
        value={encode(value)}
        onChange={(e) => onChange(decode(e.target.value))}
        className="h-9 max-w-72 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
      >
        <option value="all">Toda la plataforma</option>
        {organizations.length > 0 ? (
          <optgroup label="Empresas">
            {organizations.map((o) => (
              <option key={o.id} value={`org:${o.id}`}>
                {o.name}
              </option>
            ))}
          </optgroup>
        ) : null}
        {professionals.length > 0 ? (
          <optgroup label="Profesionales">
            {professionals.map((p) => (
              <option key={p.userId} value={`pro:${p.userId}`}>
                {p.organizationName
                  ? `${p.name} · ${p.organizationName}`
                  : p.name}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </label>
  );
}
