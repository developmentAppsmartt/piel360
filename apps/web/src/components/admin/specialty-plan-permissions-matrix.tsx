"use client";

import type { AnalysisProviderSlug } from "@piel360/shared";
import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import { ApiError } from "@/lib/api-error";
import {
  useSpecialtyPlanPermissions,
  useUpdateSpecialtyPlanPermissions,
  type SpecialtyPlanPermissionRow,
} from "@/lib/queries/specialty-plan-permissions";

const PROVIDER_SLUGS: AnalysisProviderSlug[] = [
  "skiniver",
  "youcam",
  "fitzpatrick",
];

function providerLabel(slug: AnalysisProviderSlug) {
  return ANALYSIS_PROVIDER_STATIC_LABELS[slug];
}

export function SpecialtyPlanPermissionsMatrix() {
  const query = useSpecialtyPlanPermissions();
  const mutation = useUpdateSpecialtyPlanPermissions();

  function toggle(
    row: SpecialtyPlanPermissionRow,
    slug: AnalysisProviderSlug,
    enabled: boolean,
  ) {
    mutation.mutate({
      roleId: row.roleId,
      providers: { [slug]: enabled },
    });
  }

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando permisos…</p>;
  }
  if (query.error) {
    const message =
      query.error instanceof ApiError
        ? query.error.message
        : "Error inesperado";
    const needsApiRestart =
      query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <p>No se pudieron cargar los permisos por especialidad.</p>
        <p className="mt-1 text-xs opacity-90">{message}</p>
        {needsApiRestart ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Reinicia la API (`npm run start:dev` en `apps/api`) para cargar el
            endpoint nuevo y vuelve a intentar.
          </p>
        ) : null}
      </div>
    );
  }

  const rows = query.data ?? [];

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-3 font-semibold">Especialidad</th>
            {PROVIDER_SLUGS.map((slug) => (
              <th key={slug} className="px-4 py-3 text-center font-semibold">
                {providerLabel(slug)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.roleSlug} className="border-t border-border">
              <td className="px-4 py-3 font-medium">{row.label}</td>
              {PROVIDER_SLUGS.map((slug) => (
                <td key={slug} className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={row.providers[slug]}
                    disabled={mutation.isPending || !row.roleId}
                    onChange={(e) => toggle(row, slug, e.target.checked)}
                    aria-label={`${row.label} — ${providerLabel(slug)}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {mutation.isPending ? (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Guardando cambios…
        </p>
      ) : null}
    </div>
  );
}
