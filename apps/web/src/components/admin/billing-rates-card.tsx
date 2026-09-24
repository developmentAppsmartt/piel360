"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, Save } from "lucide-react";
import {
  BILLING_CONFIG_KEYS,
  DEFAULT_BILLING_RATES,
  resolveEffectiveFxRate,
} from "@piel360/shared";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { apiClientFetch } from "@/lib/api-client";
import { useAllAppConfigs, useUpdateAppConfig } from "@/lib/queries/app-config";

function parseRate(raw: string, allowNegative = false): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return allowNegative ? 0 : null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  if (!allowNegative && n < 0) return null;
  return n;
}

function formatMoney(n: number) {
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function BillingRatesCard() {
  const { data: configs, isLoading } = useAllAppConfigs();
  const updateMutation = useUpdateAppConfig();
  const queryClient = useQueryClient();

  const [usdBalance, setUsdBalance] = useState("0");
  const [eurBalance, setEurBalance] = useState("0");
  const [ivaPercent, setIvaPercent] = useState(
    String(DEFAULT_BILLING_RATES.ivaPercentDefault),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usdMarket = useMemo(() => {
    const row = configs?.find((c) => c.key === BILLING_CONFIG_KEYS.usdToCop);
    const n = row ? Number(row.value) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_BILLING_RATES.usdMarket;
  }, [configs]);

  const eurMarket = useMemo(() => {
    const row = configs?.find((c) => c.key === BILLING_CONFIG_KEYS.eurToCop);
    const n = row ? Number(row.value) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_BILLING_RATES.eurMarket;
  }, [configs]);

  const fxUpdatedAt = useMemo(() => {
    const row = configs?.find(
      (c) => c.key === BILLING_CONFIG_KEYS.fxRatesUpdatedAt,
    );
    return row?.value && row.value.length > 0 ? row.value : null;
  }, [configs]);

  useEffect(() => {
    if (!configs) return;
    const usdBal = configs.find(
      (c) => c.key === BILLING_CONFIG_KEYS.usdToCopBalance,
    );
    const eurBal = configs.find(
      (c) => c.key === BILLING_CONFIG_KEYS.eurToCopBalance,
    );
    const iva = configs.find(
      (c) => c.key === BILLING_CONFIG_KEYS.ivaPercentDefault,
    );
    if (usdBal) setUsdBalance(usdBal.value);
    if (eurBal) setEurBalance(eurBal.value);
    if (iva) setIvaPercent(iva.value);
  }, [configs]);

  const usdEffective = resolveEffectiveFxRate(
    usdMarket,
    parseRate(usdBalance, true) ?? 0,
  );
  const eurEffective = resolveEffectiveFxRate(
    eurMarket,
    parseRate(eurBalance, true) ?? 0,
  );

  const refreshMutation = useMutation({
    mutationFn: () =>
      apiClientFetch<{
        usdMarket: number;
        eurMarket: number;
        updatedAt: string;
      }>("/admin/billing/fx-rates/refresh", { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["app-config"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    const usdBal = parseRate(usdBalance, true);
    const eurBal = parseRate(eurBalance, true);
    const iva = parseRate(ivaPercent);
    if (usdBal == null) {
      setError("Indica un balance USD válido (puede ser 0).");
      return;
    }
    if (eurBal == null) {
      setError("Indica un balance EUR válido (puede ser 0).");
      return;
    }
    if (iva == null || iva < 0 || iva > 100) {
      setError("El IVA debe ser un número entre 0 y 100.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        key: BILLING_CONFIG_KEYS.usdToCopBalance,
        value: String(usdBal),
      });
      await updateMutation.mutateAsync({
        key: BILLING_CONFIG_KEYS.eurToCopBalance,
        value: String(eurBal),
      });
      await updateMutation.mutateAsync({
        key: BILLING_CONFIG_KEYS.ivaPercentDefault,
        value: String(iva),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar balance / IVA.",
      );
    }
  };

  return (
    <ModuleCard className="space-y-4 p-5">
      <div>
        <ModuleCardTitle>TRM e IVA (global)</ModuleCardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Dólar y euro se toman de{" "}
          <a
            href="https://co.dolarapi.com"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            dolarapi.com
          </a>{" "}
          (máximo entre compra, venta y último cierre). El balance se suma a ese
          valor para los cálculos de tokens. Actualización automática a las 6:00
          (Colombia).
        </p>
        {fxUpdatedAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Última sync API:{" "}
            {new Date(fxUpdatedAt).toLocaleString("es-CO", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "America/Bogota",
            })}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Dólar → COP (API)</span>
              <input
                type="text"
                readOnly
                className="h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm tabular-nums text-muted-foreground"
                value={formatMoney(usdMarket)}
              />
              <span className="text-xs text-muted-foreground">
                YouCam / Fitzpatrick · solo lectura
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Euro → COP (API)</span>
              <input
                type="text"
                readOnly
                className="h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm tabular-nums text-muted-foreground"
                value={formatMoney(eurMarket)}
              />
              <span className="text-xs text-muted-foreground">
                Skiniver · solo lectura
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Balance USD</span>
              <input
                type="text"
                inputMode="decimal"
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                value={usdBalance}
                onChange={(e) => setUsdBalance(e.target.value)}
                placeholder="0"
              />
              <span className="text-xs text-muted-foreground">
                Efectivo: {formatMoney(usdEffective)} COP
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Balance EUR</span>
              <input
                type="text"
                inputMode="decimal"
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                value={eurBalance}
                onChange={(e) => setEurBalance(e.target.value)}
                placeholder="0"
              />
              <span className="text-xs text-muted-foreground">
                Efectivo: {formatMoney(eurEffective)} COP
              </span>
            </label>
          </div>
          <label className="flex max-w-xs flex-col gap-1.5 text-sm">
            <span className="font-medium">IVA (%)</span>
            <input
              type="text"
              inputMode="decimal"
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
              value={ivaPercent}
              onChange={(e) => setIvaPercent(e.target.value)}
              placeholder="19"
            />
            <span className="text-xs text-muted-foreground">
              Solo planes con IVA activo
            </span>
          </label>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {refreshMutation.isError ? (
        <p className="text-sm text-destructive">
          {refreshMutation.error instanceof ApiError
            ? refreshMutation.error.message
            : "No se pudo actualizar desde dolarapi."}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={updateMutation.isPending || isLoading}
        >
          <Save className="mr-2 size-4" />
          {updateMutation.isPending ? "Guardando…" : "Guardar balance / IVA"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError(null);
            refreshMutation.mutate();
          }}
          disabled={refreshMutation.isPending || isLoading}
        >
          <RefreshCw
            className={`mr-2 size-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}
          />
          {refreshMutation.isPending ? "Actualizando…" : "Actualizar desde API"}
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="size-4" />
            Guardado
          </span>
        ) : null}
      </div>
    </ModuleCard>
  );
}
