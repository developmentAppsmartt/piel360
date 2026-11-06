"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { revealGatewaySecrets, type GatewaySecrets } from "@/lib/queries/gateway-configs";

const FIELDS: { key: keyof GatewaySecrets; label: string }[] = [
  { key: "publicKey", label: "Public key" },
  { key: "privateKey", label: "Private key" },
  { key: "integritySecret", label: "Secreto de integridad" },
  { key: "webhookSecret", label: "Secreto de eventos/webhook" },
  { key: "payoutApiKey", label: "Payout API key" },
  { key: "payoutUserPrincipalId", label: "User principal id" },
];

/** Las claves guardadas, en claro, para compararlas con el panel de Wompi.
 * Se piden al pulsar el primer ojo y viven solo en este componente. */
export function GatewaySecretsPanel({ configId }: { configId: string }) {
  const [secrets, setSecrets] = useState<GatewaySecrets | null>(null);
  const [shown, setShown] = useState<Set<keyof GatewaySecrets>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: keyof GatewaySecrets) {
    setError(null);
    if (!secrets) {
      setLoading(true);
      try {
        setSecrets(await revealGatewaySecrets(configId));
      } catch (err) {
        setError(
          err instanceof ApiError && err.status === 403
            ? "Solo el superadmin puede ver las claves."
            : err instanceof Error
              ? err.message
              : "No se pudieron leer las claves.",
        );
        return;
      } finally {
        setLoading(false);
      }
    }
    setShown((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <ModuleCard className="space-y-4 p-5">
      <div>
        <ModuleCardTitle>Claves guardadas</ModuleCardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Visibles solo para el superadmin; queda registrado quién las ve. Sirven
          para comprobar que coinciden con la cuenta del panel de Wompi.
        </p>
      </div>
      <ul className="divide-y divide-border/80">
        {FIELDS.map(({ key, label }) => {
          const visible = shown.has(key) && secrets;
          const value = secrets?.[key] ?? null;
          return (
            <li key={key} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-0.5 break-all font-mono text-sm text-foreground">
                  {visible ? (value ?? "— sin configurar —") : "••••••••••••"}
                </p>
              </div>
              {visible && value ? (
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(value)}
                  aria-label={`Copiar ${label}`}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Copy className="size-4" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void toggle(key)}
                disabled={loading}
                aria-label={visible ? `Ocultar ${label}` : `Ver ${label}`}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : visible ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </ModuleCard>
  );
}
