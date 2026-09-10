"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lightbulb, Plus } from "lucide-react";
import type { FitzpatrickScale } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardDescription, ModuleCardTitle } from "@/components/ui/module-card";
import { FitzpatrickRuleCard } from "@/components/fitzpatrick-rules/fitzpatrick-rule-card";
import { FitzpatrickRuleSimulator } from "@/components/fitzpatrick-rules/fitzpatrick-rule-simulator";
import { useProducts } from "@/lib/queries/products";
import { useRoutines } from "@/lib/queries/routines";
import { useTreatments } from "@/lib/queries/treatments";
import {
  useDeleteFitzpatrickRule,
  useFitzpatrickRules,
  useSimulateFitzpatrickRule,
  type FitzpatrickSimulationResult,
} from "@/lib/queries/fitzpatrick-rules";

type CatalogMaps = {
  products: Map<string, string>;
  routines: Map<string, string>;
  treatments: Map<string, string>;
  supplements: Map<string, string>;
};

export function FitzpatrickRulesConfigurator() {
  const router = useRouter();
  const rulesQuery = useFitzpatrickRules();
  const deleteRule = useDeleteFitzpatrickRule();
  const simulate = useSimulateFitzpatrickRule();
  const productsQuery = useProducts(undefined, "product");
  const supplementsQuery = useProducts(undefined, "supplement");
  const routinesQuery = useRoutines(true);
  const treatmentsQuery = useTreatments({ kind: "treatment" });

  const [fitzpatrickScale, setFitzpatrickScale] = useState<FitzpatrickScale>("III");
  const [simulation, setSimulation] = useState<FitzpatrickSimulationResult | null>(null);

  const catalog = useMemo<CatalogMaps>(() => {
    const products = new Map(
      (productsQuery.data ?? []).map((item) => [item.id, item.productName] as const),
    );
    const supplements = new Map(
      (supplementsQuery.data ?? []).map((item) => [item.id, item.productName] as const),
    );
    const routines = new Map(
      (routinesQuery.data ?? []).map((item) => [item.id, item.name] as const),
    );
    const treatments = new Map(
      (treatmentsQuery.data ?? []).map((item) => [item.id, item.name] as const),
    );
    return { products, routines, treatments, supplements };
  }, [productsQuery.data, supplementsQuery.data, routinesQuery.data, treatmentsQuery.data]);

  const activeCount = useMemo(
    () => (rulesQuery.data ?? []).filter((rule) => rule.isActive).length,
    [rulesQuery.data],
  );

  async function handleSimulate() {
    const result = await simulate.mutateAsync({ fitzpatrickScale });
    setSimulation(result);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/doctor/rutinas"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver a rutinas y tratamientos
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reglas por fototipo</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Recomienda productos, rutinas, tratamientos y suplementos según el fototipo
              (escala Fitzpatrick) del paciente.
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/doctor/reglas-fototipo/nueva")}>
          <Plus className="mr-2 size-4" />
          Nueva regla
        </Button>
      </div>

      <ModuleCard className="border-primary/20 bg-primary/5 p-5">
        <ModuleCardTitle className="text-base">¿Cómo funciona?</ModuleCardTitle>
        <ModuleCardDescription className="mt-2 text-sm leading-relaxed">
          Cada regla condiciona sus recomendaciones a un único <strong>fototipo (I a VI)</strong>{" "}
          del paciente. Si necesitas cubrir varios fototipos, crea una regla por cada uno.
        </ModuleCardDescription>
      </ModuleCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {rulesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando reglas…</p>
          ) : null}

          {(rulesQuery.data ?? []).map((rule) => (
            <FitzpatrickRuleCard
              key={rule.id}
              rule={rule}
              catalog={catalog}
              onEdit={() => router.push(`/doctor/reglas-fototipo/${rule.id}/editar`)}
              onDelete={() => void deleteRule.mutateAsync(rule.id)}
              deleting={deleteRule.isPending}
            />
          ))}

          <button
            type="button"
            onClick={() => router.push("/doctor/reglas-fototipo/nueva")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="size-4" />
            Agregar nueva regla
          </button>
        </div>

        <FitzpatrickRuleSimulator
          fitzpatrickScale={fitzpatrickScale}
          onScaleChange={setFitzpatrickScale}
          onSimulate={() => void handleSimulate()}
          loading={simulate.isPending}
          result={simulation}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleCard className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 size-5 text-amber-500" />
            <div>
              <p className="font-semibold">Consejos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Vincula solo catálogo ya creado (productos, rutinas, tratamientos, suplementos).
              </p>
            </div>
          </div>
        </ModuleCard>
        <ModuleCard className="border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Reglas activas</p>
              <p className="mt-1 text-sm text-emerald-800">
                {activeCount} regla{activeCount === 1 ? "" : "s"} configurada
                {activeCount === 1 ? "" : "s"}.
              </p>
            </div>
          </div>
        </ModuleCard>
      </div>
    </div>
  );
}
