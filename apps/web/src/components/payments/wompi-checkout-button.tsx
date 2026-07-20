"use client";

import Script from "next/script";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { apiClientFetch } from "@/lib/api-client";
import { useCreateWompiCheckout } from "@/lib/queries/payments";
import type { Subscription } from "@/lib/queries/subscriptions";

const WOMPI_WIDGET_URL = "https://checkout.wompi.co/widget.js";
const POLL_MS = 3000;
const MAX_ATTEMPTS = 20; // ~1 min de polling activo en el cliente

interface WompiTransactionResult {
  transaction: { id: string; status: string; reference: string };
}

interface WompiWidgetCheckoutInstance {
  open(callback: (result: WompiTransactionResult) => void): void;
}

// SDK externo sin tipos oficiales — declaramos solo lo que usamos.
declare global {
  interface Window {
    WidgetCheckout?: new (args: {
      currency: string;
      amountInCents: number;
      reference: string;
      publicKey: string;
      signature: { integrity: string };
      customerData: { email: string; fullName: string };
    }) => WompiWidgetCheckoutInstance;
  }
}

export function WompiCheckoutButton({
  planId,
  label = "Suscribirse",
}: {
  planId: string;
  label?: string;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const checkout = useCreateWompiCheckout();
  const queryClient = useQueryClient();

  const polling = useQuery({
    queryKey: ["wompi-poll", activeSubscriptionId],
    queryFn: async () => {
      // Se actualiza acá (no en un efecto de render) — es la respuesta a
      // cada fetch real disparado por refetchInterval, no una sincronización
      // de estado derivado.
      setAttempts((a) => a + 1);
      return apiClientFetch<Subscription[]>("/me/subscriptions");
    },
    enabled: !!activeSubscriptionId,
    refetchInterval: (query) => {
      const sub = query.state.data?.find((s) => s.id === activeSubscriptionId);
      if (sub && sub.status !== "pending") return false;
      if (query.state.dataUpdateCount >= MAX_ATTEMPTS) return false;
      return POLL_MS;
    },
  });

  const matched = polling.data?.find((s) => s.id === activeSubscriptionId);
  const resolved = !!matched && matched.status !== "pending";
  const timedOut = !!activeSubscriptionId && !resolved && attempts >= MAX_ATTEMPTS;
  const waiting = !!activeSubscriptionId && !resolved && !timedOut;

  // El callback del widget NO activa la suscripción (solo el webhook firmado
  // lo hace, ver payments.service.ts#handleWompiWebhook) — este efecto solo
  // refresca el resto de la página (plan picker, resumen) una vez el polling
  // confirma la activación real.
  useEffect(() => {
    if (resolved) {
      queryClient.invalidateQueries({ queryKey: ["me", "subscriptions"] });
    }
  }, [resolved, queryClient]);

  async function handleClick() {
    if (!sdkReady || !window.WidgetCheckout) return;
    try {
      const result = await checkout.mutateAsync(planId);
      const widget = new window.WidgetCheckout({
        currency: result.currency,
        amountInCents: result.amount,
        reference: result.reference,
        publicKey: result.publicKey,
        signature: { integrity: result.integrity },
        customerData: { email: result.customerEmail, fullName: result.customerFullName },
      });
      widget.open(() => {
        setAttempts(0);
        setActiveSubscriptionId(result.subscriptionId);
      });
    } catch {
      // El error queda expuesto vía checkout.error, renderizado más abajo.
    }
  }

  return (
    <div className="space-y-2">
      <Script src={WOMPI_WIDGET_URL} onReady={() => setSdkReady(true)} />

      <Button type="button" disabled={!sdkReady || checkout.isPending || waiting} onClick={handleClick}>
        {checkout.isPending ? "Iniciando pago..." : label}
      </Button>

      {checkout.error && (
        <p className="text-sm text-destructive">
          {checkout.error instanceof ApiError ? checkout.error.message : "No se pudo iniciar el pago."}
        </p>
      )}

      {waiting && (
        <p className="text-sm text-muted-foreground">
          Esperando confirmación del pago... esto puede tardar unos segundos.
        </p>
      )}

      {timedOut && (
        <p className="text-sm text-muted-foreground">
          El pago sigue procesándose — revisa el historial en unos minutos.
        </p>
      )}
    </div>
  );
}
