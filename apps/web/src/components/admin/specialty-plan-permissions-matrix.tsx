"use client";

import type { AnalysisProviderSlug } from "@piel360/shared";
import { Fragment } from "react";
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

function MatrixRows({
  rows,
  onToggle,
  pending,
}: {
  rows: SpecialtyPlanPermissionRow[];
  onToggle: (
    row: SpecialtyPlanPermissionRow,
    slug: AnalysisProviderSlug,
    enabled: boolean,
  ) => void;
  pending: boolean;
}) {
  return (
    <>
      {rows.map((row) => (
        <tr key={row.roleSlug} className="border-t border-border">
          <td className="px-4 py-3 font-medium">{row.label}</td>
          {PROVIDER_SLUGS.map((slug) => (
            <td key={slug} className="px-4 py-3 text-center">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={row.providers[slug]}
                disabled={pending || !row.roleId}
                onChange={(e) => onToggle(row, slug, e.target.checked)}
                aria-label={`${row.label} — ${providerLabel(slug)}`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
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

  const rows = (query.data ?? []).map((row) => ({
    ...row,
    kind: row.kind ?? ("specialty" as const),
  }));
  const specialtyRows = rows.filter((row) => row.kind !== "labor_technician");
  const laborRows = rows.filter((row) => row.kind === "labor_technician");

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-3 font-semibold">Profesional</th>
            {PROVIDER_SLUGS.map((slug) => (
              <th key={slug} className="px-4 py-3 text-center font-semibold">
                {providerLabel(slug)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specialtyRows.length > 0 ? (
            <Fragment>
              <tr className="border-t border-border bg-muted/20">
                <td
                  colSpan={1 + PROVIDER_SLUGS.length}
                  className="px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  Especialidades médicas
                </td>
              </tr>
              <MatrixRows rows={specialtyRows} onToggle={toggle} pending={mutation.isPending} />
            </Fragment>
          ) : null}
          {laborRows.length > 0 ? (
            <Fragment>
              <tr className="border-t border-border bg-muted/20">
                <td
                  colSpan={1 + PROVIDER_SLUGS.length}
                  className="px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  Técnicos laborales
                </td>
              </tr>
              <MatrixRows rows={laborRows} onToggle={toggle} pending={mutation.isPending} />
            </Fragment>
          ) : null}
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={1 + PROVIDER_SLUGS.length}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                No hay especialidades ni perfiles técnicos configurados.
              </td>
            </tr>
          ) : null}
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
