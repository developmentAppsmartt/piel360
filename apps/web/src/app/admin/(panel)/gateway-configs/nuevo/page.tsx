"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AlliedPayoutsOverviewPanel } from "@/components/admin/allied-payouts-overview-panel";
import { GatewayConfigForm } from "@/components/admin/gateway-config-form";
import { useCreateGatewayConfig } from "@/lib/queries/gateway-configs";

export default function NuevaPasarelaPage() {
  const router = useRouter();
  const create = useCreateGatewayConfig();

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
        <h1 className="text-2xl font-semibold tracking-tight">Nueva pasarela</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Configura cobros Wompi y Pagos a Terceros para dispersar comisiones a
          todos los referidos / empresas aliadas.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <GatewayConfigForm
          submitLabel="Crear pasarela"
          onCancel={() => router.push("/admin/gateway-configs")}
          onSubmit={async (input) => {
            await create.mutateAsync(input);
            router.push("/admin/gateway-configs");
          }}
        />
        <AlliedPayoutsOverviewPanel />
      </div>
    </div>
  );
}
