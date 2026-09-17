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
    referralCommissionPercent: number | null;
  };
  referredUser: {
    id: string;
    email: string;
    name: string;
    specialty: string | null;
    verificationStatus: string | null;
  } | null;
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
          Profesionales registrados con URL, QR o código de una empresa aliada.
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
                <th className="px-4 py-3 font-medium">Empresa aliada</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Profesional</th>
                <th className="px-4 py-3 font-medium">Especialidad</th>
                <th className="px-4 py-3 font-medium">Comisión</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Aún no hay profesionales referidos.
                  </td>
                </tr>
              ) : (
                query.data!.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      {r.organization.name}
                      <span className="block text-xs text-muted-foreground">
                        {r.organization.type === "empresa_aliada"
                          ? "Empresa aliada"
                          : r.organization.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{r.code}</td>
                    <td className="px-4 py-3">
                      {r.referredUser ? (
                        <>
                          <span className="font-medium">{r.referredUser.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {r.referredUser.email}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.referredUser?.specialty ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.organization.referralCommissionPercent != null
                        ? `${r.organization.referralCommissionPercent}%`
                        : "—"}
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
