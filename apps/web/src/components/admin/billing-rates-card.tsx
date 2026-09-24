"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { BILLING_CONFIG_KEYS, DEFAULT_BILLING_RATES } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { useAllAppConfigs, useUpdateAppConfig } from "@/lib/queries/app-config";

function parseRate(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function BillingRatesCard() {
  const { data: configs, isLoading } = useAllAppConfigs();
  const updateMutation = useUpdateAppConfig();

  const [usdToCop, setUsdToCop] = useState(
    String(DEFAULT_BILLING_RATES.usdToCop),
  );
  const [eurToCop, setEurToCop] = useState(
    String(DEFAULT_BILLING_RATES.eurToCop),
  );
  const [ivaPercent, setIvaPercent] = useState(
    String(DEFAULT_BILLING_RATES.ivaPercentDefault),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configs) return;
    const usd = configs.find((c) => c.key === BILLING_CONFIG_KEYS.usdToCop);
    const eur = configs.find((c) => c.key === BILLING_CONFIG_KEYS.eurToCop);
    const iva = configs.find(
      (c) => c.key === BILLING_CONFIG_KEYS.ivaPercentDefault,
    );
    if (usd) setUsdToCop(usd.value);
    if (eur) setEurToCop(eur.value);
    if (iva) setIvaPercent(iva.value);
  }, [configs]);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    const usd = parseRate(usdToCop);
    const eur = parseRate(eurToCop);
    const iva = parseRate(ivaPercent);
    if (usd == null) {
      setError("Indica un valor válido para Dólar → COP.");
      return;
    }
    if (eur == null) {
      setError("Indica un valor válido para Euro → COP.");
      return;
    }
    if (iva == null || iva > 100) {
      setError("El IVA debe ser un número entre 0 y 100.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        key: BILLING_CONFIG_KEYS.usdToCop,
        value: String(usd),
      });
      await updateMutation.mutateAsync({
        key: BILLING_CONFIG_KEYS.eurToCop,
        value: String(eur),
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
          : "No se pudo guardar la TRM / IVA.",
      );
    }
  };

  return (
    <ModuleCard className="space-y-4 p-5">
      <div>
        <ModuleCardTitle>TRM e IVA (global)</ModuleCardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Dólar y euro en COP para convertir el costo de tokens API. El IVA se
          suma en checkout solo a planes con IVA activo.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Dólar → COP</span>
            <input
              type="text"
              inputMode="decimal"
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
              value={usdToCop}
              onChange={(e) => setUsdToCop(e.target.value)}
              placeholder="3500"
            />
            <span className="text-xs text-muted-foreground">
              YouCam / Fitzpatrick
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Euro → COP</span>
            <input
              type="text"
              inputMode="decimal"
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
              value={eurToCop}
              onChange={(e) => setEurToCop(e.target.value)}
              placeholder="3800"
            />
            <span className="text-xs text-muted-foreground">Skiniver</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
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

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={updateMutation.isPending || isLoading}
        >
          <Save className="mr-2 size-4" />
          {updateMutation.isPending ? "Guardando…" : "Guardar TRM / IVA"}
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
