"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Info, Users } from "lucide-react";
import { RolePermissionsMatrix } from "@/components/admin/role-permissions-matrix";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import { usePermissions } from "@/lib/queries/roles";
import { useAnalysisProviders } from "@/lib/queries/plans";
import type { PlanAdmin, PlanInput, PlanType } from "@/lib/queries/plans";
import { cn } from "@/lib/utils";

const BUSINESS_WIZARD_STEPS = [
  { id: 1, label: "Información del plan" },
  { id: 2, label: "Módulos y permisos" },
  { id: 3, label: "Usuarios permitidos" },
  { id: 4, label: "Revisión y confirmación" },
] as const;

const INDIVIDUAL_WIZARD_STEPS = [
  { id: 1, label: "Información del plan" },
  { id: 2, label: "Revisión y confirmación" },
] as const;

function getWizardSteps(planType: PlanType) {
  return planType === "individual" ? INDIVIDUAL_WIZARD_STEPS : BUSINESS_WIZARD_STEPS;
}

function maxWizardStep(planType: PlanType) {
  return planType === "individual" ? 2 : 4;
}

function isReviewStep(step: number, planType: PlanType) {
  return step === maxWizardStep(planType);
}

import { PLAN_ROLE_OPTIONS } from "@/lib/plan-roles";

export type { PlanRoleKey } from "@/lib/plan-roles";
export { PLAN_ROLE_OPTIONS };

export type PlanWizardState = {
  name: string;
  analysisProviderIds: string[];
  analysisLimit: number;
  price: number;
  durationDays: number;
  isActive: boolean;
  description: string;
  maxUsers: number;
  modules: Set<string>;
  roleLimits: Record<string, number>;
};

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

function emptyRoleLimits(): Record<string, number> {
  return Object.fromEntries(PLAN_ROLE_OPTIONS.map((role) => [role.key, 0]));
}

function stateFromPlan(plan: PlanAdmin): PlanWizardState {
  const analysisProviderIds =
    plan.analysisProviderIds?.length > 0
      ? plan.analysisProviderIds
      : [plan.analysisProviderId];

  return {
    name: plan.name,
    analysisProviderIds,
    analysisLimit: plan.analysisLimit,
    price: Number(plan.price),
    durationDays: plan.durationDays,
    isActive: plan.isActive,
    description: plan.description ?? "",
    maxUsers: plan.maxUsers ?? 1,
    modules: new Set(plan.modules ?? []),
    roleLimits: { ...emptyRoleLimits(), ...(plan.roleLimits ?? {}) },
  };
}

function toPlanInput(state: PlanWizardState, planType: PlanType): PlanInput {
  const base = {
    name: state.name.trim(),
    analysisProviderIds: state.analysisProviderIds,
    analysisProviderId: state.analysisProviderIds[0],
    analysisLimit: state.analysisLimit,
    price: state.price,
    durationDays: state.durationDays,
    isActive: state.isActive,
    description: state.description.trim() || undefined,
    planType,
  };

  if (planType === "individual") {
    return {
      ...base,
      maxUsers: 1,
      modules: [],
      roleLimits: {},
    };
  }

  return {
    ...base,
    maxUsers: state.maxUsers,
    modules: [...state.modules],
    roleLimits: state.roleLimits,
  };
}

function PlanWizardStepper({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: readonly { id: number; label: string }[];
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-0">
      {steps.map((step, index) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <li key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active && "bg-primary/10 text-primary",
                done && "text-primary",
                !active && !done && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  active && "bg-primary text-primary-foreground",
                  done && "bg-primary text-primary-foreground",
                  !active && !done && "border border-border bg-background",
                )}
              >
                {done ? <Check className="size-3.5" /> : step.id}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 ? (
              <span className="mx-2 hidden h-px w-8 bg-border sm:block" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function UsersAllowedCard({
  maxUsers,
  onChange,
}: {
  maxUsers: number;
  onChange: (value: number) => void;
}) {
  return (
    <ModuleCard className="space-y-4">
      <ModuleCardTitle>Usuarios permitidos del plan</ModuleCardTitle>
      <div className="flex gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-sm text-indigo-900">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Este plan permite un máximo de usuarios en total. Este límite aplica para
          todos los roles.
        </p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">
          Número de usuarios permitidos <span className="text-destructive">*</span>
        </span>
        <input
          type="number"
          min={1}
          className={inputClass}
          value={maxUsers}
          onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        />
        <span className="text-xs text-muted-foreground">
          Límite máximo de usuarios que puede tener la cuenta.
        </span>
      </label>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <Users className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Total de usuarios permitidos</p>
            <p className="text-xs text-muted-foreground">
              Límite máximo de usuarios en la cuenta
            </p>
          </div>
        </div>
        <p className="text-lg font-bold text-primary tabular-nums">
          {maxUsers} / {maxUsers}
        </p>
      </div>
    </ModuleCard>
  );
}

export function PlanWizardForm({
  mode,
  planType,
  defaultValues,
  onSubmit,
}: {
  mode: "create" | "edit";
  planType: PlanType;
  defaultValues?: PlanAdmin;
  onSubmit: (input: PlanInput) => Promise<void>;
}) {
  const router = useRouter();
  const providers = useAnalysisProviders();
  const permissionsQuery = usePermissions();
  const wizardSteps = getWizardSteps(planType);
  const lastStep = maxWizardStep(planType);
  const isIndividual = planType === "individual";
  const [step, setStep] = useState(1);
  const [state, setState] = useState<PlanWizardState>(() =>
    defaultValues
      ? stateFromPlan(defaultValues)
      : {
          name: "",
          analysisProviderIds: [],
          analysisLimit: 500,
          price: 249900,
          durationDays: 30,
          isActive: true,
          description: "",
          maxUsers: isIndividual ? 1 : 10,
          modules: new Set<string>(),
          roleLimits: emptyRoleLimits(),
        },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const assignedRolesTotal = useMemo(
    () => Object.values(state.roleLimits).reduce((sum, value) => sum + (value || 0), 0),
    [state.roleLimits],
  );

  const providerLabels = useMemo(() => {
    const list = providers.data ?? [];
    return state.analysisProviderIds
      .map((id) => {
        const provider = list.find((item) => item.id === id);
        if (!provider) return null;
        const slug = provider.slug as keyof typeof ANALYSIS_PROVIDER_STATIC_LABELS;
        return ANALYSIS_PROVIDER_STATIC_LABELS[slug] ?? provider.name;
      })
      .filter((label) => label != null);
  }, [providers.data, state.analysisProviderIds]);

  function toggleBusinessProvider(providerId: string) {
    setState((current) => {
      const set = new Set(current.analysisProviderIds);
      if (set.has(providerId)) set.delete(providerId);
      else set.add(providerId);
      return { ...current, analysisProviderIds: [...set] };
    });
  }

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!state.name.trim()) return "El nombre del plan es requerido.";
      if (state.analysisProviderIds.length === 0) {
        return isIndividual
          ? "Selecciona un análisis para el plan."
          : "Selecciona al menos un análisis para el paquete.";
      }
      if (isIndividual && state.analysisProviderIds.length !== 1) {
        return "El plan individual solo puede incluir un análisis.";
      }
      if (state.analysisLimit < 0) return "El límite de análisis debe ser mayor o igual a 0.";
      if (state.price < 0) return "El precio debe ser mayor o igual a 0.";
      if (state.durationDays < 1) return "La duración debe ser al menos 1 día.";
      if (!isIndividual && state.maxUsers < 1) {
        return "Debe permitir al menos 1 usuario.";
      }
      if (state.description.length > 300) return "La descripción no puede superar 300 caracteres.";
    }
    if (!isIndividual && current === 2 && state.modules.size === 0) {
      return "Selecciona al menos un módulo o permiso.";
    }
    if (!isIndividual && current === 3 && assignedRolesTotal > state.maxUsers) {
      return `La suma de usuarios por rol (${assignedRolesTotal}) supera el máximo del plan (${state.maxUsers}).`;
    }
    return null;
  }

  function goNext() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((current) => Math.min(lastStep, current + 1));
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleCreate() {
    const validationError = isIndividual
      ? validateStep(1)
      : validateStep(1) ?? validateStep(2) ?? validateStep(3);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(toPlanInput(state, planType));
      router.push("/admin/planes");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el plan.");
    } finally {
      setSaving(false);
    }
  }

  const planTypeLabel = isIndividual ? "individual" : "empresas";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/admin/planes" className="hover:text-foreground">
            Planes
          </Link>{" "}
          ›{" "}
          <span className="text-foreground">
            {mode === "create"
              ? `Crear plan ${isIndividual ? "individual" : "empresas"}`
              : `Editar ${defaultValues?.name}`}
          </span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {mode === "create"
            ? `Crear plan ${planTypeLabel}`
            : `Editar plan ${isIndividual ? "individual" : "empresas"}`}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {isIndividual
            ? "Define nombre, proveedor, límites y precio del plan para un profesional individual."
            : "Define las características, límites, módulos y usuarios permitidos para este plan."}
        </p>
      </div>

      <PlanWizardStepper currentStep={step} steps={wizardSteps} />

      {step === 1 ? (
        <div
          className={cn(
            "grid gap-6",
            !isIndividual && "xl:grid-cols-[minmax(0,1fr)_360px]",
          )}
        >
          <ModuleCard className="space-y-5">
            <ModuleCardTitle>Información del plan</ModuleCardTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Nombre del plan"
                value={state.name}
                onChange={(e) => setState({ ...state, name: e.target.value })}
                placeholder="Plan Profesional"
                required
              />
              <div className="flex flex-col gap-3 md:col-span-2">
                <div>
                  <p className="text-sm font-medium">
                    {isIndividual ? "Análisis incluido" : "Paquete de análisis"}{" "}
                    <span className="text-destructive">*</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isIndividual
                      ? "Elige un solo tipo de análisis para este plan."
                      : "Selecciona 1, 2 o los 3 análisis que incluye este plan empresas."}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(providers.data ?? []).map((provider) => {
                    const slug = provider.slug as keyof typeof ANALYSIS_PROVIDER_STATIC_LABELS;
                    const label = ANALYSIS_PROVIDER_STATIC_LABELS[slug] ?? provider.name;
                    const selected = state.analysisProviderIds.includes(provider.id);
                    return (
                      <label
                        key={provider.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:border-primary/40",
                        )}
                      >
                        <input
                          type={isIndividual ? "radio" : "checkbox"}
                          name={isIndividual ? "plan-analysis" : undefined}
                          className="mt-0.5 size-4 accent-primary"
                          checked={selected}
                          onChange={() => {
                            if (isIndividual) {
                              setState({ ...state, analysisProviderIds: [provider.id] });
                            } else {
                              toggleBusinessProvider(provider.id);
                            }
                          }}
                        />
                        <span>
                          <span className="font-medium text-foreground">{label}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">
                  Límite de análisis IA por mes <span className="text-destructive">*</span>
                </span>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={state.analysisLimit}
                  onChange={(e) =>
                    setState({ ...state, analysisLimit: Number(e.target.value) || 0 })
                  }
                />
                <span className="text-xs text-muted-foreground">
                  Cantidad máxima de análisis IA disponibles por mes.
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">
                  Precio (COP) <span className="text-destructive">*</span>
                </span>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={state.price}
                  onChange={(e) => setState({ ...state, price: Number(e.target.value) || 0 })}
                />
                <span className="text-xs text-muted-foreground">Precio mensual del plan.</span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">
                  Duración (días) <span className="text-destructive">*</span>
                </span>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={state.durationDays}
                  onChange={(e) =>
                    setState({ ...state, durationDays: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
                <span className="text-xs text-muted-foreground">
                  Duración de la suscripción del plan.
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={state.isActive}
                  onChange={(e) => setState({ ...state, isActive: e.target.checked })}
                />
                ¿Está activo?
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Descripción</span>
              <textarea
                rows={4}
                maxLength={300}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                value={state.description}
                onChange={(e) => setState({ ...state, description: e.target.value })}
                placeholder="Plan ideal para profesionales de la salud..."
              />
              <span className="text-xs text-muted-foreground">Máximo 300 caracteres.</span>
            </label>
            <Button type="button" onClick={goNext}>
              Guardar y continuar
            </Button>
          </ModuleCard>

          {!isIndividual ? (
            <UsersAllowedCard
              maxUsers={state.maxUsers}
              onChange={(maxUsers) => setState({ ...state, maxUsers })}
            />
          ) : null}
        </div>
      ) : null}

      {!isIndividual && step === 2 ? (
        <ModuleCard className="space-y-4">
          <div>
            <ModuleCardTitle>Módulos y permisos</ModuleCardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecciona los módulos y acciones que incluirá este plan en la plataforma.
            </p>
          </div>
          <RolePermissionsMatrix
            permissions={permissionsQuery.data ?? []}
            selected={state.modules}
            onChange={(modules) => setState({ ...state, modules })}
            selectionMode="name"
            loading={permissionsQuery.isLoading}
          />
        </ModuleCard>
      ) : null}

      {!isIndividual && step === 3 ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ModuleCard className="space-y-4">
            <div>
              <ModuleCardTitle>Distribución por rol</ModuleCardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Opcionalmente define cuántos usuarios de cada rol puede tener la cuenta.
                La suma no debe superar el máximo del plan.
              </p>
            </div>
            <div className="space-y-3">
              {PLAN_ROLE_OPTIONS.map((role) => (
                <label
                  key={role.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
                >
                  <span className="font-medium text-foreground">{role.label}</span>
                  <input
                    type="number"
                    min={0}
                    className="h-9 w-24 rounded-lg border border-border bg-background px-2 text-right text-sm"
                    value={state.roleLimits[role.key] ?? 0}
                    onChange={(e) =>
                      setState({
                        ...state,
                        roleLimits: {
                          ...state.roleLimits,
                          [role.key]: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Asignados: <strong>{assignedRolesTotal}</strong> de{" "}
              <strong>{state.maxUsers}</strong> usuarios
            </p>
          </ModuleCard>
          <UsersAllowedCard
            maxUsers={state.maxUsers}
            onChange={(maxUsers) => setState({ ...state, maxUsers })}
          />
        </div>
      ) : null}

      {isReviewStep(step, planType) ? (
        <ModuleCard className="space-y-5">
          <ModuleCardTitle>Revisión y confirmación</ModuleCardTitle>
          <div className={cn("grid gap-4", !isIndividual && "md:grid-cols-2")}>
            <div className="rounded-xl border border-border p-4 text-sm">
              <p className="font-semibold text-foreground">Información general</p>
              <dl className="mt-3 space-y-2 text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <dt>Tipo</dt>
                  <dd className="text-right font-medium text-foreground">
                    {isIndividual ? "Individual" : "Empresas"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Nombre</dt>
                  <dd className="text-right font-medium text-foreground">{state.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{isIndividual ? "Análisis" : "Paquete"}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {providerLabels.length > 0 ? providerLabels.join(" · ") : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Análisis IA / mes</dt>
                  <dd className="text-right font-medium text-foreground">{state.analysisLimit}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Precio</dt>
                  <dd className="text-right font-medium text-foreground">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      maximumFractionDigits: 0,
                    }).format(state.price)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Duración</dt>
                  <dd className="text-right font-medium text-foreground">
                    {state.durationDays} días
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Estado</dt>
                  <dd className="text-right font-medium text-foreground">
                    {state.isActive ? "Activo" : "Inactivo"}
                  </dd>
                </div>
              </dl>
            </div>
            {!isIndividual ? (
              <div className="rounded-xl border border-border p-4 text-sm">
                <p className="font-semibold text-foreground">Usuarios y permisos</p>
                <dl className="mt-3 space-y-2 text-muted-foreground">
                  <div className="flex justify-between gap-4">
                    <dt>Usuarios máximos</dt>
                    <dd className="text-right font-medium text-foreground">{state.maxUsers}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Permisos seleccionados</dt>
                    <dd className="text-right font-medium text-foreground">{state.modules.size}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Usuarios por rol</dt>
                    <dd className="text-right font-medium text-foreground">{assignedRolesTotal}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
          {state.description ? (
            <p className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              {state.description}
            </p>
          ) : null}
        </ModuleCard>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/planes")}>
          Cancelar
        </Button>
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={goBack}>
            Anterior
          </Button>
        ) : null}
        {step < lastStep ? (
          <Button type="button" onClick={goNext}>
            Siguiente: {wizardSteps[step]?.label ?? "Continuar"}
          </Button>
        ) : (
          <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
            {saving ? "Guardando…" : mode === "create" ? "Crear plan" : "Guardar cambios"}
          </Button>
        )}
      </div>
    </div>
  );
}
