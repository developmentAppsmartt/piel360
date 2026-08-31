"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

type OrgAdmin = {
  id: string;
  type: string;
  name: string;
  seatPlan: string;
  seatLimit: number;
  seatUsed: number;
  status: string;
  referralCode: string | null;
  owner: { id: string; email: string; name: string };
  referralsCount: number;
};

const ORG_STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  pending: "Pendiente",
  suspended: "Suspendida",
};

function orgStatusLabel(status: string) {
  return ORG_STATUS_LABELS[status] ?? status;
}

export default function AdminEquiposPage() {
  const query = useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: () => apiClientFetch<OrgAdmin[]>("/admin/organizations"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Equipos</h1>
        <p className="text-sm text-muted-foreground">
          Organizaciones empresa / empresa aliada y uso de espacios.
        </p>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los equipos.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Organización</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Espacios</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No hay organizaciones aún.
                  </td>
                </tr>
              ) : (
                query.data!.map((org) => (
                  <tr key={org.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{org.name}</td>
                    <td className="px-4 py-3">{org.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {org.owner.name}
                      <br />
                      <span className="text-xs">{org.owner.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      {org.seatUsed}/{org.seatLimit} ({org.seatPlan})
                    </td>
                    <td className="px-4 py-3">{orgStatusLabel(org.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
