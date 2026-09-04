"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Info, Users } from "lucide-react";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import { useAdminLaborTechnicianProfiles } from "@/lib/queries/labor-technician-profiles";
import { useAnalysisProviders } from "@/lib/queries/plans";
import type { PlanAdmin, PlanInput, PlanType } from "@/lib/queries/plans";
import { useAdminSpecialties } from "@/lib/queries/specialties";
import {
  planRoleOptionsFromCatalog,
  type PlanRoleOption,
  PLAN_ROLE_OPTIONS,
} from "@/lib/plan-roles";
import { cn } from "@/lib/utils";

const BUSINESS_WIZARD_STEPS = [
  { id: 1, label: "Información del plan" },
  { id: 2, label: "Usuarios permitidos" },
  { id: 3, label: "Revisión y confirmación" },
] as const;

const INDIVIDUAL_WIZARD_STEPS = [
  { id: 1, label: "Información del plan" },
  { id: 2, label: "Revisión y confirmación" },
] as const;

function getWizardSteps(planType: PlanType) {
  return planType === "individual" ? INDIVIDUAL_WIZARD_STEPS : BUSINESS_WIZARD_STEPS;
}

function maxWizardStep(planType: PlanType) {
  return planType === "individual" ? 2 : 3;
}

function isReviewStep(step: number, planType: PlanType) {
  return step === maxWizardStep(planType);
}

export type { PlanRoleKey } from "@/lib/plan-roles";
export { PLAN_ROLE_OPTIONS };

export type PlanWizardState = {
  name: string;
  analysisProviderIds: string[];
  /** Límite único (planes individuales). */
  analysisLimit: number;
  /** Límite bolsa Skiniver (dermatológico). */
  skiniverLimit: number;
  /** Límite bolsa Perfect Corp (estético + fototipo). */
  aestheticLimit: number;
  price: number;
  durationDays: number;
  isActive: boolean;
  description: string;
  maxUsers: number;
  roleLimits: Record<string, number>;
};

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

function emptyRoleLimits(options: PlanRoleOption[]): Record<string, number> {
  return Object.fromEntries(options.map((role) => [role.key, 0]));
}

function parseAnalysisLimits(plan: PlanAdmin): {
  skiniverLimit: number;
  aestheticLimit: number;
} {
  const limits = plan.analysisLimits ?? {};
  if (typeof limits.skiniver === "number" || typeof limits.aesthetic === "number") {
    return {
      skiniverLimit: limits.skiniver ?? 0,
      aestheticLimit: limits.aesthetic ?? 0,
    };
  }
  // Planes antiguos: un solo analysisLimit → asignarlo al primer proveedor del paquete.
  const slugs = (plan.providers ?? [plan.provider]).map((provider) => provider.slug);
  const hasSkiniver = slugs.includes("skiniver");
  const hasAesthetic = slugs.some((slug) => slug === "youcam" || slug === "fitzpatrick");
  if (hasSkiniver && !hasAesthetic) {
    return { skiniverLimit: plan.analysisLimit, aestheticLimit: 0 };
  }
  if (hasAesthetic && !hasSkiniver) {
    return { skiniverLimit: 0, aestheticLimit: plan.analysisLimit };
  }
  return {
    skiniverLimit: hasSkiniver ? plan.analysisLimit : 0,
    aestheticLimit: hasAesthetic ? plan.analysisLimit : 0,
  };
}

function stateFromPlan(plan: PlanAdmin, roleOptions: PlanRoleOption[]): PlanWizardState {
  const analysisProviderIds =
    plan.analysisProviderIds?.length > 0
      ? plan.analysisProviderIds
      : [plan.analysisProviderId];
  const { skiniverLimit, aestheticLimit } = parseAnalysisLimits(plan);

  return {
    name: plan.name,
    analysisProviderIds,
    analysisLimit: plan.analysisLimit,
    skiniverLimit,
    aestheticLimit,
    price: Number(plan.price),
    durationDays: plan.durationDays,
    isActive: plan.isActive,
    description: plan.description ?? "",
    maxUsers: plan.maxUsers ?? 1,
    roleLimits: { ...emptyRoleLimits(roleOptions), ...(plan.roleLimits ?? {}) },
  };
}

function toPlanInput(
  state: PlanWizardState,
  planType: PlanType,
  providerSlugById: Map<string, string>,
): PlanInput {
  const selectedSlugs = state.analysisProviderIds
    .map((id) => providerSlugById.get(id))
    .filter((slug): slug is string => Boolean(slug));
  const hasSkiniver = selectedSlugs.includes("skiniver");
  const hasAesthetic = selectedSlugs.some(
    (slug) => slug === "youcam" || slug === "fitzpatrick",
  );

  const skiniverLimit = hasSkiniver ? state.skiniverLimit : 0;
  const aestheticLimit = hasAesthetic ? state.aestheticLimit : 0;
  const analysisLimit =
    planType === "individual"
      ? state.analysisLimit
      : skiniverLimit + aestheticLimit;

  const base = {
    name: state.name.trim(),
    analysisProviderIds: state.analysisProviderIds,
    analysisProviderId: state.analysisProviderIds[0],
    analysisLimit,
    analysisLimits:
      planType === "individual"
        ? selectedSlugs[0] === "skiniver"
          ? { skiniver: state.analysisLimit, aesthetic: 0 }
          : { skiniver: 0, aesthetic: state.analysisLimit }
        : { skiniver: skiniverLimit, aesthetic: aestheticLimit },
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
    modules: [],
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
  const specialties = useAdminSpecialties();
  const laborProfiles = useAdminLaborTechnicianProfiles();
  const wizardSteps = getWizardSteps(planType);
  const lastStep = maxWizardStep(planType);
  const isIndividual = planType === "individual";

  const roleOptions = useMemo(
    () =>
      planRoleOptionsFromCatalog({
        specialties: specialties.data,
        laborProfiles: laborProfiles.data,
      }),
    [specialties.data, laborProfiles.data],
  );

  const [step, setStep] = useState(1);
  const [state, setState] = useState<PlanWizardState>(() =>
    defaultValues
      ? stateFromPlan(defaultValues, PLAN_ROLE_OPTIONS)
      : {
          name: "",
          analysisProviderIds: [],
          analysisLimit: 10,
          skiniverLimit: 500,
          aestheticLimit: 500,
          price: 249900,
          durationDays: 30,
          isActive: true,
          description: "",
          maxUsers: isIndividual ? 1 : 10,
          roleLimits: emptyRoleLimits(PLAN_ROLE_OPTIONS),
        },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cuando llega el catálogo de roles, rellena claves faltantes sin pisar valores.
  useEffect(() => {
    setState((current) => ({
      ...current,
      roleLimits: { ...emptyRoleLimits(roleOptions), ...current.roleLimits },
    }));
  }, [roleOptions]);

  const assignedRolesTotal = useMemo(
    () => Object.values(state.roleLimits).reduce((sum, value) => sum + (value || 0), 0),
    [state.roleLimits],
  );
  const seatsRemaining = Math.max(0, state.maxUsers - assignedRolesTotal);
  const seatsFull = seatsRemaining === 0;

  const providerSlugById = useMemo(() => {
    const map = new Map<string, string>();
    for (const provider of providers.data ?? []) {
      map.set(provider.id, provider.slug);
    }
    return map;
  }, [providers.data]);

  const selectedSlugs = useMemo(
    () =>
      state.analysisProviderIds
        .map((id) => providerSlugById.get(id))
        .filter((slug): slug is string => Boolean(slug)),
    [state.analysisProviderIds, providerSlugById],
  );
  const skiniverEnabled = selectedSlugs.includes("skiniver");
  const aestheticEnabled = selectedSlugs.some(
    (slug) => slug === "youcam" || slug === "fitzpatrick",
  );

  const providerLabels = useMemo(() => {
    return selectedSlugs.map((slug) => {
      const key = slug as keyof typeof ANALYSIS_PROVIDER_STATIC_LABELS;
      return ANALYSIS_PROVIDER_STATIC_LABELS[key] ?? slug;
    });
  }, [selectedSlugs]);

  const specialtyRoles = roleOptions.filter((role) => role.group === "specialty");
  const laborRoles = roleOptions.filter((role) => role.group === "labor");

  function toggleBusinessProvider(providerId: string) {
    setState((current) => {
      const set = new Set(current.analysisProviderIds);
      if (set.has(providerId)) set.delete(providerId);
      else set.add(providerId);
      return { ...current, analysisProviderIds: [...set] };
    });
  }

  function setRoleLimit(key: string, nextRaw: number) {
    const currentValue = state.roleLimits[key] ?? 0;
    const next = Math.max(0, nextRaw);
    const maxAllowed = currentValue + seatsRemaining;
    const clamped = Math.min(next, maxAllowed);
    setState({
      ...state,
      roleLimits: {
        ...state.roleLimits,
        [key]: clamped,
      },
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
      if (isIndividual && state.analysisLimit < 0) {
        return "El límite de análisis debe ser mayor o igual a 0.";
      }
      if (!isIndividual) {
        if (skiniverEnabled && state.skiniverLimit < 0) {
          return "El límite dermatológico debe ser mayor o igual a 0.";
        }
        if (aestheticEnabled && state.aestheticLimit < 0) {
          return "El límite estético/fototipo debe ser mayor o igual a 0.";
        }
        if (skiniverEnabled && aestheticEnabled) {
          if (state.skiniverLimit + state.aestheticLimit < 1) {
            return "Define al menos un crédito en los límites de análisis.";
          }
        } else if (skiniverEnabled && state.skiniverLimit < 1) {
          return "Define el límite de análisis dermatológico.";
        } else if (aestheticEnabled && state.aestheticLimit < 1) {
          return "Define el límite de análisis estético/fototipo.";
        }
      }
      if (state.price < 0) return "El precio debe ser mayor o igual a 0.";
      if (state.durationDays < 1) return "La duración debe ser al menos 1 día.";
      if (!isIndividual && state.maxUsers < 1) {
        return "Debe permitir al menos 1 usuario.";
      }
      if (state.description.length > 300) return "La descripción no puede superar 300 caracteres.";
    }
    if (!isIndividual && current === 2 && assignedRolesTotal > state.maxUsers) {
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
      : validateStep(1) ?? validateStep(2);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(toPlanInput(state, planType, providerSlugById));
      router.push("/admin/planes");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el plan.");
    } finally {
      setSaving(false);
    }
  }

  const planTypeLabel = isIndividual ? "individual" : "empresas";

  function renderRoleInputs(roles: PlanRoleOption[], title: string) {
    if (roles.length === 0) return null;
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        {roles.map((role) => {
          const value = state.roleLimits[role.key] ?? 0;
          const disabled = seatsFull && value === 0;
          return (
            <label
              key={role.key}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm",
                disabled && "opacity-60",
              )}
            >
              <span className="font-medium text-foreground">{role.label}</span>
              <input
                type="number"
                min={0}
                max={value + seatsRemaining}
                disabled={disabled}
                className="h-9 w-24 rounded-lg border border-border bg-background px-2 text-right text-sm disabled:cursor-not-allowed disabled:bg-muted"
                value={value}
                onChange={(e) => setRoleLimit(role.key, Number(e.target.value) || 0)}
              />
            </label>
          );
        })}
      </div>
    );
  }

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
            : "Define las características, límites de análisis y usuarios permitidos para este plan."}
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
                        <span className="font-medium text-foreground">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {isIndividual ? (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">
                    Límite de análisis IA <span className="text-destructive">*</span>
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
                </label>
              ) : (
                <>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">
                      Límite dermatológico (Skiniver){" "}
                      {skiniverEnabled ? <span className="text-destructive">*</span> : null}
                    </span>
                    <input
                      type="number"
                      min={0}
                      disabled={!skiniverEnabled}
                      className={cn(inputClass, !skiniverEnabled && "cursor-not-allowed bg-muted")}
                      value={skiniverEnabled ? state.skiniverLimit : 0}
                      onChange={(e) =>
                        setState({
                          ...state,
                          skiniverLimit: Number(e.target.value) || 0,
                        })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {skiniverEnabled
                        ? "Créditos de la bolsa dermatológica."
                        : "Actívalo seleccionando Piel 360 AI · Dermatológico."}
                    </span>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">
                      Límite estético / fototipo{" "}
                      {aestheticEnabled ? <span className="text-destructive">*</span> : null}
                    </span>
                    <input
                      type="number"
                      min={0}
                      disabled={!aestheticEnabled}
                      className={cn(inputClass, !aestheticEnabled && "cursor-not-allowed bg-muted")}
                      value={aestheticEnabled ? state.aestheticLimit : 0}
                      onChange={(e) =>
                        setState({
                          ...state,
                          aestheticLimit: Number(e.target.value) || 0,
                        })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {aestheticEnabled
                        ? "Créditos compartidos YouCam + Fitzpatrick (bolsa Perfect Corp)."
                        : "Actívalo seleccionando Estético y/o Fototipo."}
                    </span>
                  </label>
                </>
              )}

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
                    setState({
                      ...state,
                      durationDays: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ModuleCard className="space-y-5">
            <div>
              <ModuleCardTitle>Distribución por rol</ModuleCardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Define cuántos usuarios de cada especialidad o perfil técnico puede tener la
                cuenta. Al completar el máximo, los selectores vacíos se deshabilitan.
              </p>
            </div>
            {renderRoleInputs(specialtyRoles, "Especialistas / profesionales")}
            {renderRoleInputs(laborRoles, "Técnicos laborales")}
            <p className="text-sm text-muted-foreground">
              Asignados: <strong>{assignedRolesTotal}</strong> de{" "}
              <strong>{state.maxUsers}</strong> usuarios
              {seatsFull ? (
                <span className="ml-2 text-amber-700">· Cupo completo</span>
              ) : null}
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
                {isIndividual ? (
                  <div className="flex justify-between gap-4">
                    <dt>Análisis IA</dt>
                    <dd className="text-right font-medium text-foreground">
                      {state.analysisLimit}
                    </dd>
                  </div>
                ) : (
                  <>
                    {skiniverEnabled ? (
                      <div className="flex justify-between gap-4">
                        <dt>Límite dermatológico</dt>
                        <dd className="text-right font-medium text-foreground">
                          {state.skiniverLimit}
                        </dd>
                      </div>
                    ) : null}
                    {aestheticEnabled ? (
                      <div className="flex justify-between gap-4">
                        <dt>Límite estético/fototipo</dt>
                        <dd className="text-right font-medium text-foreground">
                          {state.aestheticLimit}
                        </dd>
                      </div>
                    ) : null}
                  </>
                )}
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
                <p className="font-semibold text-foreground">Usuarios</p>
                <dl className="mt-3 space-y-2 text-muted-foreground">
                  <div className="flex justify-between gap-4">
                    <dt>Usuarios máximos</dt>
                    <dd className="text-right font-medium text-foreground">{state.maxUsers}</dd>
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
