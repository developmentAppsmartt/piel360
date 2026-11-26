import { UsersRound } from "lucide-react";
import { formatCOP } from "@/components/payments/subscription-utils";
import type { ReferralReportRow } from "./referral-report-filters";

const th = "px-4 py-3 text-left text-sm font-semibold text-foreground whitespace-nowrap";
const td = "px-4 py-3 align-top";

export function ReferralReportTable({
  rows,
  withOrganization,
  emptyMessage,
}: {
  rows: ReferralReportRow[];
  withOrganization: boolean;
  emptyMessage: string;
}) {
  const columns = withOrganization ? 8 : 7;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="bg-muted/50">
          <tr>
            {withOrganization ? <th className={th}>Empresa aliada</th> : null}
            <th className={th}>Código</th>
            <th className={th}>Profesional</th>
            <th className={th}>Nombre plan</th>
            <th className={th}>Especialidad</th>
            <th className={th}>% Comisión</th>
            <th className={th}>Valor Comisión</th>
            <th className={th}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns} className="px-4 py-12">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <span className="flex size-16 items-center justify-center rounded-full bg-muted">
                    <UsersRound className="size-8" aria-hidden />
                  </span>
                  {emptyMessage}
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                {withOrganization ? <td className={td}>{r.organization.name}</td> : null}
                <td className={`${td} font-mono`}>{r.code}</td>
                <td className={td}>
                  <span className="font-medium">{r.professional.name}</span>
                  <span className="block text-xs text-muted-foreground">{r.professional.email}</span>
                </td>
                <td className={td}>{r.planName ?? "—"}</td>
                <td className={`${td} text-muted-foreground`}>{r.specialty ?? "—"}</td>
                <td className={`${td} tabular-nums`}>
                  {r.commissionPercent != null ? `${r.commissionPercent}%` : "—"}
                </td>
                <td className={`${td} tabular-nums`}>{formatCOP(r.commissionValue)}</td>
                <td className={`${td} text-muted-foreground tabular-nums`}>
                  {new Date(r.date).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
