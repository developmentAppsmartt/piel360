"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FlaskConical,
  Layers3,
  Lightbulb,
  Pencil,
  Pill,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardDescription, ModuleCardTitle } from "@/components/ui/module-card";
import { SkinAgeRuleFormDialog } from "@/components/skin-age-rules/skin-age-rule-form-dialog";
import { SkinAgeRuleSimulator } from "@/components/skin-age-rules/skin-age-rule-simulator";
import { useProducts } from "@/lib/queries/products";
import { useRoutines } from "@/lib/queries/routines";
import {
  useCreateSkinAgeRule,
  useDeleteSkinAgeRule,
  useSimulateSkinAgeRule,
  useSkinAgeRules,
  useUpdateSkinAgeRule,
  type SkinAgeRule,
  type SkinAgeRuleInput,
  type SkinAgeSimulationResult,
} from "@/lib/queries/skin-age-rules";
import { useTreatments } from "@/lib/queries/treatments";
import {
  SKIN_AGE_RULE_COLOR_STYLES,
  formatSkinAgeDifferenceRange,
  priorityLabel,
} from "@/lib/skin-age-rules-ui";
import { cn } from "@/lib/utils";

type CatalogMaps = {
  products: Map<string, string>;
  routines: Map<string, string>;
  treatments: Map<string, string>;
  supplements: Map<string, string>;
};

function namesFor(ids: string[], map: Map<string, string>) {
  return ids.map((id) => ({ id, name: map.get(id) ?? `Ítem ${id}` }));
}

export function SkinAgeRulesConfigurator() {
  const rulesQuery = useSkinAgeRules();
  const createRule = useCreateSkinAgeRule();
  const updateRule = useUpdateSkinAgeRule();
  const deleteRule = useDeleteSkinAgeRule();
  const simulate = useSimulateSkinAgeRule();
  const productsQuery = useProducts(undefined, "product");
  const supplementsQuery = useProducts(undefined, "supplement");
  const routinesQuery = useRoutines(true);
  const treatmentsQuery = useTreatments({ kind: "treatment" });

  const [birthDate, setBirthDate] = useState("1987-03-15");
  const [skinAgeYears, setSkinAgeYears] = useState(46);
  const [simulation, setSimulation] = useState<SkinAgeSimulationResult | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SkinAgeRule | null>(null);

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
  }, [
    productsQuery.data,
    supplementsQuery.data,
    routinesQuery.data,
    treatmentsQuery.data,
  ]);

  const activeCount = useMemo(
    () => (rulesQuery.data ?? []).filter((rule) => rule.isActive).length,
    [rulesQuery.data],
  );

  function openCreate() {
    setEditingRule(null);
    setFormOpen(true);
  }

  function openEdit(rule: SkinAgeRule) {
    setEditingRule(rule);
    setFormOpen(true);
  }

  async function handleSubmit(input: SkinAgeRuleInput) {
    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule.id, input });
      return;
    }
    await createRule.mutateAsync({
      ...input,
      sortOrder: (rulesQuery.data?.length ?? 0) + 1,
    });
  }

  async function handleSimulate() {
    const result = await simulate.mutateAsync({ birthDate, skinAgeYears });
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
            <h1 className="text-2xl font-semibold tracking-tight">
              Edad de la piel vs edad cronológica
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Compara la edad del paciente con la edad de la piel del análisis y recomienda
              productos, rutinas, tratamientos y suplementos según esa diferencia.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nueva regla
        </Button>
      </div>

      <ModuleCard className="border-primary/20 bg-primary/5 p-5">
        <ModuleCardTitle className="text-base">¿Cómo funciona?</ModuleCardTitle>
        <ModuleCardDescription className="mt-2 text-sm leading-relaxed">
          <strong>Edad del paciente</strong> = edad cronológica (fecha de nacimiento).{" "}
          <strong>Edad del análisis</strong> = edad de piel que calcula la IA. Diferencia =
          edad de la piel − edad del paciente. Negativo = piel más joven; positivo = piel más
          envejecida.
        </ModuleCardDescription>
      </ModuleCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {rulesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando reglas…</p>
          ) : null}

          {(rulesQuery.data ?? []).map((rule) => (
            <RuleSummaryCard
              key={rule.id}
              rule={rule}
              catalog={catalog}
              onEdit={() => openEdit(rule)}
              onDelete={() => void deleteRule.mutateAsync(rule.id)}
              deleting={deleteRule.isPending}
            />
          ))}

          <button
            type="button"
            onClick={openCreate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="size-4" />
            Agregar nueva regla
          </button>
        </div>

        <SkinAgeRuleSimulator
          birthDate={birthDate}
          skinAgeYears={skinAgeYears}
          onBirthDateChange={setBirthDate}
          onSkinAgeChange={setSkinAgeYears}
          onSimulate={() => void handleSimulate()}
          loading={simulate.isPending}
          result={simulation}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ModuleCard className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 size-5 text-amber-500" />
            <div>
              <p className="font-semibold">Consejos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Usa rangos realistas y evita solapamientos. Vincula solo catálogo ya creado.
              </p>
            </div>
          </div>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="font-semibold">Ejemplo clínico</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paciente 39 años, edad de piel 46 → diferencia +7. Coincide con +4 a +7.
          </p>
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

      <SkinAgeRuleFormDialog
        open={formOpen}
        rule={editingRule}
        onClose={() => {
          setFormOpen(false);
          setEditingRule(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function RuleSummaryCard({
  rule,
  catalog,
  onEdit,
  onDelete,
  deleting,
}: {
  rule: SkinAgeRule;
  catalog: CatalogMaps;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  const colors = SKIN_AGE_RULE_COLOR_STYLES[rule.colorKey];
  const productNames = namesFor(rule.productGroupIds, catalog.products);
  const routineNames = namesFor(rule.routineIds, catalog.routines);
  const treatmentNames = namesFor(rule.treatmentIds, catalog.treatments);
  const supplementNames = namesFor(rule.supplementGroupIds, catalog.supplements);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex">
        <div className={cn("w-1.5 shrink-0", colors.bar)} aria-hidden />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-48 max-w-sm space-y-1">
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                SI
              </p>
              <p className={cn("text-base font-semibold", colors.text)}>
                Diferencia{" "}
                {formatSkinAgeDifferenceRange(rule.minDifference, rule.maxDifference)}
              </p>
              <p className="text-sm text-muted-foreground">
                {rule.description ?? "Sin descripción clínica."}
              </p>
              <p className="text-xs text-muted-foreground">
                Prioridad: {priorityLabel(rule.priority)}
                {!rule.isActive ? " · Inactiva" : ""}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={onEdit}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
                disabled={deleting}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Entonces recomendar
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <RecommendationColumn
                title="Productos"
                icon={FlaskConical}
                items={productNames}
              />
              <RecommendationColumn
                title="Rutinas"
                icon={CalendarDays}
                items={routineNames}
              />
              <RecommendationColumn
                title="Tratamientos"
                icon={Layers3}
                items={treatmentNames}
              />
              <RecommendationColumn
                title="Suplementos"
                icon={Pill}
                items={supplementNames}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function RecommendationColumn({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof FlaskConical;
  items: { id: string; name: string }[];
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-primary">
        <Icon className="size-4 shrink-0" />
        <span className="text-xs font-semibold tracking-wide uppercase">{title}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin vincular</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-sm font-medium text-foreground"
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
