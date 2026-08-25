"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

type ReferralAdmin = {
  id: string;
  code: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    type: string;
    referralCode: string | null;
  };
  referredUser: { id: string; email: string; name: string } | null;
};

export default function AdminReferidosPage() {
  const query = useQuery({
    queryKey: ["admin", "referrals"],
    queryFn: () => apiClientFetch<ReferralAdmin[]>("/admin/referrals"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Referidos</h1>
        <p className="text-sm text-muted-foreground">
          Códigos y referidos de empresas aliadas.
        </p>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar los referidos.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Organización</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Referido</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No hay referidos registrados.
                  </td>
                </tr>
              ) : (
                query.data!.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      {r.organization.name}
                      <span className="block text-xs text-muted-foreground">
                        {r.organization.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{r.code}</td>
                    <td className="px-4 py-3">
                      {r.referredUser
                        ? `${r.referredUser.name} (${r.referredUser.email})`
                        : "Pendiente"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("es-CO")}
                    </td>
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
