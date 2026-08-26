"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

type OrgMine = {
  id: string;
  type: string;
  name: string;
  referralCode: string | null;
  referrals: Array<{
    id: string;
    code: string;
    createdAt: string;
    referredUser: { id: string; email: string; name: string } | null;
  }>;
};

export function DoctorReferidosView() {
  const query = useQuery({
    queryKey: ["organizations", "me", "referrals"],
    queryFn: () => apiClientFetch<OrgMine>("/organizations/me"),
    retry: false,
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando referidos…</p>;
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Referidos</h1>
        <p className="text-sm text-muted-foreground">
          No encontramos datos de referidos para tu cuenta.
        </p>
      </div>
    );
  }

  const org = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Referidos</h1>
        <p className="text-sm text-muted-foreground">
          Programa de referidos de {org.name}.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Tu código
        </p>
        <p className="mt-1 font-mono text-2xl font-semibold tracking-wider">
          {org.referralCode ?? "—"}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Usuario referido</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {org.referrals.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Aún no hay referidos registrados.
                </td>
              </tr>
            ) : (
              org.referrals.map((r) => (
                <tr key={r.id} className="border-t border-border">
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
    </div>
  );
}
