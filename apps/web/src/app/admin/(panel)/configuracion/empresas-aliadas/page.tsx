"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { ApiError } from "@/lib/api-error";
import { apiClientFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type AlliedOrg = {
  id: string;
  name: string;
  status: string;
  referralCode: string | null;
  referralSlug: string | null;
  referralCommissionPercent: number | null;
  referralUrl: string | null;
  bankName: string | null;
  bankId: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  payoutBeneficiaryName: string | null;
  payoutBeneficiaryEmail: string | null;
  payoutLegalIdType: string | null;
  payoutLegalId: string | null;
  earnedPending: number;
  earnedDispersed: number;
  earnedTotal: number;
  pendingInvoiceCount: number;
  payoutReady: boolean;
  owner: { id: string; email: string; name: string };
  referralsCount: number;
};

type WompiBank = { id: string; name: string; code?: string };

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  pending: "Pendiente",
  suspended: "Suspendida",
};

function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function QrImage({ url }: { url: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Código QR de referido"
      width={180}
      height={180}
      className="rounded-lg border border-border bg-white p-2"
    />
  );
}

export default function AdminEmpresasAliadasPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [percent, setPercent] = useState("");
  const [bankId, setBankId] = useState("");
  const [bankAccountType, setBankAccountType] = useState("AHORROS");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [payoutBeneficiaryName, setPayoutBeneficiaryName] = useState("");
  const [payoutBeneficiaryEmail, setPayoutBeneficiaryEmail] = useState("");
  const [payoutLegalIdType, setPayoutLegalIdType] = useState("NIT");
  const [payoutLegalId, setPayoutLegalId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "organizations", "allied"],
    queryFn: () =>
      apiClientFetch<AlliedOrg[]>("/admin/organizations/allied"),
  });

  const banks = useQuery({
    queryKey: ["admin", "organizations", "allied", "wompi-banks"],
    queryFn: () =>
      apiClientFetch<WompiBank[]>("/admin/organizations/allied/wompi-banks"),
    retry: false,
    enabled: editingId != null,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: {
        referralCommissionPercent?: number;
        regenerateCode?: boolean;
        bankName?: string;
        bankId?: string;
        bankAccountType?: string;
        bankAccountNumber?: string;
        payoutBeneficiaryName?: string;
        payoutBeneficiaryEmail?: string;
        payoutLegalIdType?: string;
        payoutLegalId?: string;
      };
    }) =>
      apiClientFetch<AlliedOrg>(`/admin/organizations/${id}/allied`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "organizations", "allied"],
      });
      setEditingId(null);
      setError(null);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la configuración.",
      );
    },
  });

  const disperse = useMutation({
    mutationFn: (id: string) =>
      apiClientFetch<{
        dispersedCount: number;
        dispersedAmount: number;
        status?: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        wompiPayoutId?: string | null;
        reference?: string;
      }>(`/admin/organizations/${id}/allied/disperse`, {
        method: "POST",
      }),
    onSuccess: (result) => {
      void qc.invalidateQueries({
        queryKey: ["admin", "organizations", "allied"],
      });
      void qc.invalidateQueries({ queryKey: ["admin", "billing"] });
      if (result.dispersedCount === 0) {
        setInfo("No había comisiones pendientes.");
      } else if (result.status === "total_payment") {
        setInfo(
          `Pago Wompi aprobado: ${formatCop(result.dispersedAmount)} → ${result.bankName} · ${result.bankAccountNumber}`,
        );
      } else {
        setInfo(
          `Lote Wompi enviado (${result.status ?? "processing"}): ${formatCop(result.dispersedAmount)}. Ref ${result.reference ?? "—"}${
            result.wompiPayoutId ? ` · id ${result.wompiPayoutId}` : ""
          }`,
        );
      }
      setError(null);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo registrar la dispersión.",
      );
    },
  });

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
        <h1 className="text-2xl font-semibold">Empresa aliada</h1>
        <p className="text-sm text-muted-foreground">
          Cada aliada es un beneficiario distinto. El cron del día 1 (o
          &quot;Dispersar todas&quot; en Facturación) envía un solo lote Wompi con
          muchas transacciones — una por empresa con saldo pendiente.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-700">{info}</p> : null}

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar las empresas aliadas.
        </p>
      ) : (query.data ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Aún no hay empresas aliadas registradas.
        </p>
      ) : (
        <div className="grid gap-4">
          {query.data!.map((org) => {
            const isEditing = editingId === org.id;
            const canDisperse = org.earnedPending > 0 && org.payoutReady;
            return (
              <article
                key={org.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-lg font-semibold">{org.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {org.owner.name} · {org.owner.email}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Estado: {STATUS_LABELS[org.status] ?? org.status} ·{" "}
                        {org.referralsCount} referido
                        {org.referralsCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Código de referido
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="font-mono text-lg font-semibold">
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
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Comisión
                        </p>
                        {isEditing ? (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={percent}
                              onChange={(e) => setPercent(e.target.value)}
                              className="h-9 max-w-[120px] rounded-md border border-input bg-background px-3 text-sm"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        ) : (
                          <p className="mt-1 text-lg font-semibold">
                            {org.referralCommissionPercent != null
                              ? `${org.referralCommissionPercent}%`
                              : "Sin definir"}
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg bg-amber-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-amber-800/70">
                          Ganado pendiente
                        </p>
                        <p className="mt-1 text-lg font-semibold text-amber-800">
                          {formatCop(org.earnedPending)}
                        </p>
                        <p className="text-[11px] text-amber-800/70">
                          {org.pendingInvoiceCount} factura
                          {org.pendingInvoiceCount === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-emerald-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/70">
                          Total ganado
                        </p>
                        <p className="mt-1 text-lg font-semibold text-emerald-800">
                          {formatCop(org.earnedTotal)}
                        </p>
                        <p className="text-[11px] text-emerald-800/70">
                          Dispersado: {formatCop(org.earnedDispersed)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Beneficiario
                        </p>
                        {isEditing ? (
                          <input
                            value={payoutBeneficiaryName}
                            onChange={(e) =>
                              setPayoutBeneficiaryName(e.target.value)
                            }
                            placeholder="Nombre del titular"
                            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm font-medium">
                            {org.payoutBeneficiaryName?.trim() ||
                              "Sin configurar"}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Email beneficiario
                        </p>
                        {isEditing ? (
                          <input
                            type="email"
                            value={payoutBeneficiaryEmail}
                            onChange={(e) =>
                              setPayoutBeneficiaryEmail(e.target.value)
                            }
                            placeholder="correo@empresa.com"
                            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm font-medium">
                            {org.payoutBeneficiaryEmail?.trim() ||
                              "Sin configurar"}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Documento beneficiario
                        </p>
                        {isEditing ? (
                          <div className="mt-2 flex gap-2">
                            <select
                              value={payoutLegalIdType}
                              onChange={(e) =>
                                setPayoutLegalIdType(e.target.value)
                              }
                              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            >
                              <option value="CC">CC</option>
                              <option value="NIT">NIT</option>
                              <option value="CE">CE</option>
                            </select>
                            <input
                              value={payoutLegalId}
                              onChange={(e) =>
                                setPayoutLegalId(e.target.value)
                              }
                              placeholder="Número"
                              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            />
                          </div>
                        ) : (
                          <p className="mt-1 text-sm font-medium">
                            {org.payoutLegalIdType && org.payoutLegalId
                              ? `${org.payoutLegalIdType} ${org.payoutLegalId}`
                              : "Sin configurar"}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Banco (Wompi)
                        </p>
                        {isEditing ? (
                          <select
                            value={bankId}
                            onChange={(e) => setBankId(e.target.value)}
                            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">Seleccionar banco</option>
                            {(banks.data ?? []).map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                                {b.code ? ` (${b.code})` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="mt-1 text-sm font-medium">
                            {org.bankName?.trim() || "Sin configurar"}
                          </p>
                        )}
                        {isEditing && banks.isError ? (
                          <p className="mt-1 text-[11px] text-destructive">
                            No se pudo cargar el catálogo Wompi. Revisa credenciales de Payouts en Pasarelas.
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Tipo de cuenta
                        </p>
                        {isEditing ? (
                          <select
                            value={bankAccountType}
                            onChange={(e) => setBankAccountType(e.target.value)}
                            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="AHORROS">Ahorros</option>
                            <option value="CORRIENTE">Corriente</option>
                          </select>
                        ) : (
                          <p className="mt-1 text-sm font-medium">
                            {org.bankAccountType ?? "—"}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Número de cuenta
                        </p>
                        {isEditing ? (
                          <input
                            value={bankAccountNumber}
                            onChange={(e) => setBankAccountNumber(e.target.value)}
                            placeholder="Solo dígitos"
                            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          />
                        ) : (
                          <p className="mt-1 font-mono text-sm font-medium">
                            {org.bankAccountNumber?.trim() || "Sin configurar"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        URL de registro aliado
                      </p>
                      {org.referralUrl ? (
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
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Guarda la configuración para generar URL y QR.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            type="button"
                            disabled={update.isPending}
                            onClick={() => {
                              const value = Number(percent);
                              if (!Number.isFinite(value) || value < 0 || value > 100) {
                                setError("El porcentaje debe estar entre 0 y 100.");
                                return;
                              }
                              if (!bankId) {
                                setError("Selecciona el banco Wompi.");
                                return;
                              }
                              if (!payoutBeneficiaryName.trim()) {
                                setError(
                                  "Indica el nombre del beneficiario de la cuenta.",
                                );
                                return;
                              }
                              if (!payoutBeneficiaryEmail.trim()) {
                                setError(
                                  "Indica el email del beneficiario de la cuenta.",
                                );
                                return;
                              }
                              if (!payoutLegalId.trim()) {
                                setError(
                                  "Indica el documento del beneficiario (CC/NIT).",
                                );
                                return;
                              }
                              if (!bankAccountNumber.trim()) {
                                setError("Indica el número de cuenta.");
                                return;
                              }
                              const selected = (banks.data ?? []).find((b) => b.id === bankId);
                              update.mutate({
                                id: org.id,
                                body: {
                                  referralCommissionPercent: value,
                                  bankId,
                                  bankName: selected?.name ?? org.bankName ?? undefined,
                                  bankAccountType,
                                  bankAccountNumber,
                                  payoutBeneficiaryName,
                                  payoutBeneficiaryEmail,
                                  payoutLegalIdType,
                                  payoutLegalId,
                                },
                              });
                            }}
                          >
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null);
                              setError(null);
                            }}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingId(org.id);
                            setPercent(
                              org.referralCommissionPercent != null
                                ? String(org.referralCommissionPercent)
                                : "10",
                            );
                            setBankId(org.bankId ?? "");
                            setBankAccountType(org.bankAccountType ?? "AHORROS");
                            setBankAccountNumber(org.bankAccountNumber ?? "");
                            setPayoutBeneficiaryName(
                              org.payoutBeneficiaryName ?? "",
                            );
                            setPayoutBeneficiaryEmail(
                              org.payoutBeneficiaryEmail ?? "",
                            );
                            setPayoutLegalIdType(
                              org.payoutLegalIdType ?? "NIT",
                            );
                            setPayoutLegalId(org.payoutLegalId ?? "");
                          }}
                        >
                          Configurar
                        </Button>
                      )}
                      <Button
                        type="button"
                        disabled={disperse.isPending || !canDisperse}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `¿Enviar lote de pago Wompi por ${formatCop(org.earnedPending)} a ${org.bankName} · ${org.bankAccountNumber}?`,
                            )
                          ) {
                            return;
                          }
                          disperse.mutate(org.id);
                        }}
                      >
                        {disperse.isPending ? "Enviando a Wompi…" : "Dispersión Wompi"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({
                            id: org.id,
                            body: { regenerateCode: true },
                          })
                        }
                      >
                        <RefreshCw className="mr-2 size-4" />
                        Regenerar código
                      </Button>
                      {!org.referralUrl ? (
                        <Button
                          type="button"
                          disabled={update.isPending}
                          onClick={() =>
                            update.mutate({
                              id: org.id,
                              body: {
                                referralCommissionPercent:
                                  org.referralCommissionPercent ?? 10,
                              },
                            })
                          }
                        >
                          Generar URL / QR
                        </Button>
                      ) : null}
                    </div>
                    {!canDisperse && org.earnedPending > 0 ? (
                      <p className="text-xs text-amber-700">
                        Para dispersar: documento CC/NIT del representante, banco Wompi,
                        tipo/número de cuenta, y credenciales de Payouts en Pasarelas.
                      </p>
                    ) : null}
                  </div>

                  {org.referralUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <QrImage url={org.referralUrl} />
                      <p className="text-xs text-muted-foreground">
                        QR de registro aliado
                      </p>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
