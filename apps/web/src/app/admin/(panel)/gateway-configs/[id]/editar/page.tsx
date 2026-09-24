"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AlliedPayoutsOverviewPanel } from "@/components/admin/allied-payouts-overview-panel";
import { BillingRatesCard } from "@/components/admin/billing-rates-card";
import { GatewayConfigForm } from "@/components/admin/gateway-config-form";
import { useGatewayConfigs, useUpdateGatewayConfig } from "@/lib/queries/gateway-configs";

export default function EditarPasarelaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const configs = useGatewayConfigs();
  const update = useUpdateGatewayConfig(params.id);
  const config = configs.data?.find((item) => item.id === params.id);

  if (configs.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando pasarela…</p>;
  }

  if (!config) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">No se encontró la pasarela.</p>
        <Link href="/admin/gateway-configs" className="text-sm text-primary underline">
          Volver a Pasarelas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/gateway-configs"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a Pasarelas
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Editar pasarela — {config.gatewayName}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Checkout, fee y Pagos a Terceros. A la derecha ves todas las empresas
          aliadas (referidos) que reciben dispersión desde esta cuenta origen.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="space-y-6">
          <BillingRatesCard />
          <GatewayConfigForm
            defaultValues={config}
            submitLabel="Guardar cambios"
            onCancel={() => router.push("/admin/gateway-configs")}
            onSubmit={async (input) => {
              await update.mutateAsync(input);
              router.push("/admin/gateway-configs");
            }}
          />
        </div>
        <AlliedPayoutsOverviewPanel />
      </div>
    </div>
  );
}
