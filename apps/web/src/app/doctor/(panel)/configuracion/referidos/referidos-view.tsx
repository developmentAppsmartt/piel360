"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { apiClientFetch } from "@/lib/api-client";

type OrgMine = {
  id: string;
  type: string;
  name: string;
  referralCode: string | null;
  referralSlug: string | null;
  referralCommissionPercent: number | null;
  referralUrl: string | null;
  referrals: Array<{
    id: string;
    code: string;
    createdAt: string;
    referredUser: { id: string; email: string; name: string } | null;
  }>;
};

function QrImage({ url }: { url: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="QR de referidos"
      width={160}
      height={160}
      className="rounded-lg border border-border bg-white p-2"
    />
  );
}

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
  const isAllied = org.type === "empresa_aliada";
  const professionalReferrals = org.referrals.filter((r) => r.referredUser);

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Referidos</h1>
        <p className="text-sm text-muted-foreground">
          Programa de referidos de {org.name}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Tu código
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="font-mono text-2xl font-semibold tracking-wider">
                {org.referralCode ?? "—"}
              </p>
              {org.referralCode ? (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => void copyText(org.referralCode!)}
                  aria-label="Copiar código"
                >
                  <Copy className="size-4" />
                </button>
              ) : null}
            </div>
            {isAllied && org.referralCommissionPercent != null ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Comisión configurada: {org.referralCommissionPercent}%
              </p>
            ) : null}
          </div>

          {org.referralUrl ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                URL de registro
              </p>
              <div className="mt-1 flex items-start gap-2">
                <a
                  href={org.referralUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm text-sky-600 underline"
                >
                  {org.referralUrl}
                </a>
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => void copyText(org.referralUrl!)}
                  aria-label="Copiar URL"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {org.referralUrl ? (
          <div className="flex flex-col items-center gap-2">
            <QrImage url={org.referralUrl} />
            <p className="text-xs text-muted-foreground">QR para compartir</p>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Profesional referido</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {professionalReferrals.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Aún no hay profesionales registrados con tu código.
                </td>
              </tr>
            ) : (
              professionalReferrals.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono">{r.code}</td>
                  <td className="px-4 py-3">
                    {r.referredUser
                      ? `${r.referredUser.name} (${r.referredUser.email})`
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
    </div>
  );
}
