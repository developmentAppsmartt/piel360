"use client";

import { useState, useEffect } from "react";
import { Globe2, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllAppConfigs, useUpdateAppConfig } from "@/lib/queries/app-config";

// Monedas ISO 4217 más comunes para selector
const COMMON_CURRENCIES = [
  { code: "COP", label: "Peso Colombiano (COP)" },
  { code: "USD", label: "Dólar Estadounidense (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "MXN", label: "Peso Mexicano (MXN)" },
  { code: "BRL", label: "Real Brasileño (BRL)" },
  { code: "PEN", label: "Sol Peruano (PEN)" },
  { code: "CLP", label: "Peso Chileno (CLP)" },
  { code: "ARS", label: "Peso Argentino (ARS)" },
];

export default function ConfiguracionAdminPage() {
  const { data: configs, isLoading } = useAllAppConfigs();
  const updateMutation = useUpdateAppConfig();

  const [currency, setCurrency] = useState("COP");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const currencyConfig = configs?.find((c) => c.key === "currency_code");
    if (currencyConfig) setCurrency(currencyConfig.value);
  }, [configs]);

  const handleSave = async () => {
    await updateMutation.mutateAsync({ key: "currency_code", value: currency });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Configuración Global</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Parámetros globales que afectan a todos los doctores en la plataforma.
        </p>
      </div>

      {/* Card moneda */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/10">
            <Globe2 className="size-5 text-sidebar-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Moneda de productos</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Moneda utilizada en el módulo de productos de todos los doctores.
              Los precios existentes no se convierten automáticamente al cambiar
              la moneda.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <div className="space-y-3">
            <label
              htmlFor="currency_code"
              className="block text-sm font-medium text-foreground"
            >
              Código de moneda
            </label>
            <select
              id="currency_code"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            >
              {COMMON_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-3">
              <Button
                id="btn-guardar-moneda"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Save className="mr-2 size-4" />
                {updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>

              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 className="size-4" />
                  Guardado correctamente
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabla de configs actuales */}
      {configs && configs.length > 0 && (
        <div className="rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Configuraciones activas
            </h3>
          </div>
          <div className="divide-y divide-border">
            {configs.map((cfg) => (
              <div key={cfg.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-mono text-sm text-muted-foreground">
                  {cfg.key}
                </span>
                <span className="text-sm font-medium">{cfg.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
