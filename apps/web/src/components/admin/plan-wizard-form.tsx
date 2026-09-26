"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Info, Plus, Trash2, Users, X } from "lucide-react";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { apiClientFetch } from "@/lib/api-client";
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
import {
  DEFAULT_PLAN_HEADER_COLOR,
  PLAN_HEADER_COLORS,
  resolvePlanHeaderColor,
  BILLING_CONFIG_KEYS,
  DEFAULT_BILLING_RATES,
  API_UNITS_PER_ANALYSIS,
  computeApiTokenCostCop,
  computeSaleEconomics,
  parsePlanApiCosts,
  parsePlanCoverage,
  planCustomerPrice,
  resolveApiUnitsForPlan,
  resolveEffectiveFxRate,
  stripIvaFromGross,
  EMPTY_PLAN_COVERAGE,
  formatCoverageHtml,
  PLAN_AESTHETIC_COVERAGE_CATALOG,
  PLAN_DERM_CLASS_COVERAGE_CATALOG,
  PLAN_DERM_DISEASE_COVERAGE_CATALOG,
  type PlanApiCosts,
  type PlanCoverage,
} from "@piel360/shared";
import { useAllAppConfigs } from "@/lib/queries/app-config";
import { useGatewayConfigs } from "@/lib/queries/gateway-configs";
import { PlanCoveragePicker } from "@/components/admin/plan-coverage-picker";

type AlliedOrgPreview = {
  id: string;
  name: string;
  referralCommissionPercent: number | null;
};

export type PlanFeatureDraft = { label: string; included: boolean };
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
  /** Texto para poder borrar el valor al editar. */
  analysisLimit: string;
  skiniverLimit: string;
  aestheticLimit: string;
  price: string;
  durationDays: string;
  isActive: boolean;
  description: string;
  features: PlanFeatureDraft[];
  coverage: PlanCoverage;
  headerColor: string;
  maxUsers: string;
  roleLimits: Record<string, number>;
  ivaEnabled: boolean;
  /** Campos de costo API como texto para poder borrarlos al editar. */
  skiniverUnits: string;
  skiniverUnitPrice: string;
  youcamUnits: string;
  youcamUnitPrice: string;
  fitzpatrickUnits: string;
  fitzpatrickUnitPrice: string;
};

function emptyApiCostState() {
  return {
    ivaEnabled: false,
    skiniverUnits: "",
    skiniverUnitPrice: "",
    youcamUnits: "",
    youcamUnitPrice: "",
    fitzpatrickUnits: "",
    fitzpatrickUnitPrice: "",
  };
}

/** Acepta "0,30" o "0.30"; vacío → 0. */
function parseCostNumber(raw: string): number {
  const t = raw.trim().replace(",", ".");
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatCostField(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "";
  return String(n);
}

function formatIntField(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  return String(Math.trunc(n));
}

function apiCostsFromPlan(plan: PlanAdmin) {
  const costs = parsePlanApiCosts(plan.apiCosts);
  return {
    ivaEnabled: Boolean(plan.ivaEnabled),
    skiniverUnits: formatCostField(costs.skiniver?.units),
    skiniverUnitPrice: formatCostField(costs.skiniver?.unitPrice),
    youcamUnits: formatCostField(costs.youcam?.units),
    youcamUnitPrice: formatCostField(costs.youcam?.unitPrice),
    fitzpatrickUnits: formatCostField(costs.fitzpatrick?.units),
    fitzpatrickUnitPrice: formatCostField(costs.fitzpatrick?.unitPrice),
  };
}

function apiCostsFromState(
  state: PlanWizardState,
  selectedSlugs: string[],
  planType: PlanType,
): PlanApiCosts {
  const resolved = resolveApiUnitsForPlan({
    selectedSlugs,
    planType,
    analysisLimit: parseCostNumber(state.analysisLimit),
    skiniverLimit: parseCostNumber(state.skiniverLimit),
    aestheticLimit: parseCostNumber(state.aestheticLimit),
  });
  const out: PlanApiCosts = {};
  if (selectedSlugs.includes("skiniver")) {
    out.skiniver = {
      units: resolved.skiniverUnits,
      unitPrice: parseCostNumber(state.skiniverUnitPrice),
    };
  }
  if (selectedSlugs.includes("youcam")) {
    out.youcam = {
      units: resolved.youcamUnits,
      unitPrice: parseCostNumber(state.youcamUnitPrice),
    };
  }
  if (selectedSlugs.includes("fitzpatrick")) {
    out.fitzpatrick = {
      units: resolved.fitzpatrickUnits,
      unitPrice: parseCostNumber(state.fitzpatrickUnitPrice),
    };
  }
  return out;
}

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
    analysisLimit: formatIntField(plan.analysisLimit),
    skiniverLimit: formatIntField(skiniverLimit),
    aestheticLimit: formatIntField(aestheticLimit),
    // En el wizard el COP es el precio del plan (con IVA si aplica).
    price: formatIntField(
      plan.ivaEnabled && plan.customerPrice != null
        ? Number(plan.customerPrice)
        : Number(plan.price),
    ),
    durationDays: formatIntField(plan.durationDays),
    isActive: plan.isActive,
    description: plan.description ?? "",
    features: Array.isArray(plan.features)
      ? plan.features.map((f) => ({
          label: f.label ?? "",
          included: f.included !== false,
        }))
      : [],
    coverage: parsePlanCoverage(plan.coverage),
    headerColor: resolvePlanHeaderColor(plan.headerColor).id,
    maxUsers: formatIntField(plan.maxUsers ?? 1),
    roleLimits: { ...emptyRoleLimits(roleOptions), ...(plan.roleLimits ?? {}) },
    ...apiCostsFromPlan(plan),
  };
}

function toPlanInput(
  state: PlanWizardState,
  planType: PlanType,
  providerSlugById: Map<string, string>,
  ivaPercent: number,
): PlanInput {
  const selectedSlugs = state.analysisProviderIds
    .map((id) => providerSlugById.get(id))
    .filter((slug): slug is string => Boolean(slug));
  const hasSkiniver = selectedSlugs.includes("skiniver");
  const hasAesthetic = selectedSlugs.some(
    (slug) => slug === "youcam" || slug === "fitzpatrick",
  );

  const analysisLimitNum = parseCostNumber(state.analysisLimit);
  const skiniverLimitNum = hasSkiniver
    ? parseCostNumber(state.skiniverLimit)
    : 0;
  const aestheticLimitNum = hasAesthetic
    ? parseCostNumber(state.aestheticLimit)
    : 0;
  const analysisLimit =
    planType === "individual"
      ? analysisLimitNum
      : skiniverLimitNum + aestheticLimitNum;

  // El campo COP muestra el precio al cliente; en BD guardamos la base sin IVA.
  const rawPrice = parseCostNumber(state.price);
  const basePrice = state.ivaEnabled
    ? stripIvaFromGross(rawPrice, ivaPercent)
    : rawPrice;

  const base = {
    name: state.name.trim(),
    analysisProviderIds: state.analysisProviderIds,
    analysisProviderId: state.analysisProviderIds[0],
    analysisLimit,
    analysisLimits:
      planType === "individual"
        ? selectedSlugs[0] === "skiniver"
          ? { skiniver: analysisLimitNum, aesthetic: 0 }
          : { skiniver: 0, aesthetic: analysisLimitNum }
        : { skiniver: skiniverLimitNum, aesthetic: aestheticLimitNum },
    price: basePrice,
    durationDays: Math.max(1, parseCostNumber(state.durationDays) || 1),
    isActive: state.isActive,
    description: state.description.trim() || undefined,
    features: state.features
      .map((f) => ({ label: f.label.trim(), included: f.included }))
      .filter((f) => f.label.length > 0),
    coverage: {
      ...state.coverage,
      aestheticHtml:
        state.coverage.aestheticHtml?.trim() ||
        formatCoverageHtml(state.coverage.aesthetic),
      dermatologyClassesHtml:
        state.coverage.dermatologyClassesHtml?.trim() ||
        formatCoverageHtml(state.coverage.dermatologyClasses),
      dermatologyDiseasesHtml:
        state.coverage.dermatologyDiseasesHtml?.trim() ||
        formatCoverageHtml(state.coverage.dermatologyDiseases),
    },
    headerColor: state.headerColor || DEFAULT_PLAN_HEADER_COLOR,
    planType,
    ivaEnabled: state.ivaEnabled,
    apiCosts: apiCostsFromState(state, selectedSlugs, planType),
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
    maxUsers: Math.max(1, parseCostNumber(state.maxUsers) || 1),
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
  maxUsers: string;
  onChange: (value: string) => void;
}) {
  const maxUsersN = parseCostNumber(maxUsers);
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
          type="text"
          inputMode="numeric"
          placeholder="Ej. 10"
          className={inputClass}
          value={maxUsers}
          onChange={(e) => onChange(e.target.value)}
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
          {maxUsersN || "—"}
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
          analysisLimit: "",
          skiniverLimit: "",
          aestheticLimit: "",
          price: "",
          durationDays: "30",
          isActive: true,
          description: "",
          features: [],
          coverage: { ...EMPTY_PLAN_COVERAGE },
          headerColor: DEFAULT_PLAN_HEADER_COLOR,
          maxUsers: isIndividual ? "1" : "10",
          roleLimits: emptyRoleLimits(PLAN_ROLE_OPTIONS),
          ...emptyApiCostState(),
        },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewAllyId, setPreviewAllyId] = useState<string>("");
  const appConfigs = useAllAppConfigs();
  const gateways = useGatewayConfigs();
  const alliedOrgs = useQuery({
    queryKey: ["admin", "organizations", "allied"],
    queryFn: () =>
      apiClientFetch<AlliedOrgPreview[]>("/admin/organizations/allied"),
  });

  const alliedWithCommission = useMemo(() => {
    return (alliedOrgs.data ?? []).filter(
      (o) =>
        o.referralCommissionPercent != null &&
        Number(o.referralCommissionPercent) > 0,
    );
  }, [alliedOrgs.data]);

  useEffect(() => {
    if (previewAllyId) return;
    const first = alliedWithCommission[0];
    if (first) setPreviewAllyId(first.id);
  }, [alliedWithCommission, previewAllyId]);

  const previewAlly = useMemo(() => {
    return (
      alliedWithCommission.find((o) => o.id === previewAllyId) ??
      alliedWithCommission[0] ??
      null
    );
  }, [alliedWithCommission, previewAllyId]);

  const previewAllyPercent =
    previewAlly?.referralCommissionPercent != null
      ? Number(previewAlly.referralCommissionPercent)
      : null;

  const billingRates = useMemo(() => {
    const rows = appConfigs.data ?? [];
    const get = (key: string, fallback: number) => {
      const row = rows.find((c) => c.key === key);
      const n = row && row.value !== "" ? Number(row.value) : NaN;
      return Number.isFinite(n) ? n : fallback;
    };
    const usdMarket = Math.max(
      0,
      get(BILLING_CONFIG_KEYS.usdToCop, DEFAULT_BILLING_RATES.usdMarket),
    );
    const eurMarket = Math.max(
      0,
      get(BILLING_CONFIG_KEYS.eurToCop, DEFAULT_BILLING_RATES.eurMarket),
    );
    const usdBalance = get(BILLING_CONFIG_KEYS.usdToCopBalance, 0);
    const eurBalance = get(BILLING_CONFIG_KEYS.eurToCopBalance, 0);
    return {
      usdMarket,
      eurMarket,
      usdBalance,
      eurBalance,
      usdToCop: resolveEffectiveFxRate(usdMarket, usdBalance),
      eurToCop: resolveEffectiveFxRate(eurMarket, eurBalance),
      ivaPercentDefault: Math.max(
        0,
        get(
          BILLING_CONFIG_KEYS.ivaPercentDefault,
          DEFAULT_BILLING_RATES.ivaPercentDefault,
        ),
      ),
      fxUpdatedAt: null as string | null,
    };
  }, [appConfigs.data]);

  // Cuando llega el catálogo de roles, rellena claves faltantes sin pisar valores.
  useEffect(() => {
    setState((current) => ({
      ...current,
      roleLimits: { ...emptyRoleLimits(roleOptions), ...current.roleLimits },
    }));
  }, [roleOptions]);

  const assignedRolesTotal = useMemo(
    () =>
      Object.values(state.roleLimits).reduce((sum, value) => sum + (value || 0), 0),
    [state.roleLimits],
  );
  const seatsRemaining = Math.max(
    0,
    parseCostNumber(state.maxUsers) - assignedRolesTotal,
  );
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
  const youcamEnabled = selectedSlugs.includes("youcam");
  const fitzpatrickEnabled = selectedSlugs.includes("fitzpatrick");
  const aestheticEnabled = youcamEnabled || fitzpatrickEnabled;

  const apiUnitsResolved = useMemo(
    () =>
      resolveApiUnitsForPlan({
        selectedSlugs,
        planType,
        analysisLimit: parseCostNumber(state.analysisLimit),
        skiniverLimit: parseCostNumber(state.skiniverLimit),
        aestheticLimit: parseCostNumber(state.aestheticLimit),
      }),
    [
      selectedSlugs,
      planType,
      state.analysisLimit,
      state.skiniverLimit,
      state.aestheticLimit,
    ],
  );

  // Sincroniza unidades = análisis × ud/análisis según el tipo seleccionado.
  useEffect(() => {
    setState((current) => {
      const next = {
        ...current,
        skiniverUnits: skiniverEnabled
          ? String(apiUnitsResolved.skiniverUnits)
          : "",
        youcamUnits: youcamEnabled ? String(apiUnitsResolved.youcamUnits) : "",
        fitzpatrickUnits: fitzpatrickEnabled
          ? String(apiUnitsResolved.fitzpatrickUnits)
          : "",
      };
      if (
        next.skiniverUnits === current.skiniverUnits &&
        next.youcamUnits === current.youcamUnits &&
        next.fitzpatrickUnits === current.fitzpatrickUnits
      ) {
        return current;
      }
      return next;
    });
  }, [
    skiniverEnabled,
    youcamEnabled,
    fitzpatrickEnabled,
    apiUnitsResolved.skiniverUnits,
    apiUnitsResolved.youcamUnits,
    apiUnitsResolved.fitzpatrickUnits,
  ]);

  const economicsPreview = useMemo(() => {
    const gateway =
      (gateways.data ?? []).find((g) => g.isActive) ?? gateways.data?.[0];
    const apiCosts = apiCostsFromState(state, selectedSlugs, planType);
    const tokenCost = computeApiTokenCostCop(apiCosts, billingRates);
    const rawPrice = parseCostNumber(state.price);
    const planBase = state.ivaEnabled
      ? stripIvaFromGross(rawPrice, billingRates.ivaPercentDefault)
      : rawPrice;
    return computeSaleEconomics({
      planPrice: planBase,
      ivaEnabled: state.ivaEnabled,
      ivaPercent: billingRates.ivaPercentDefault,
      gatewayFeePercent: gateway?.feePercent ?? 2.99,
      operationalCostPercent: gateway?.operationalCostPercent ?? 0,
      operationalCostFixed: gateway?.operationalCostFixed ?? 0,
      apiTokenCostCop: tokenCost,
      // En venta real se usa el % de la empresa aliada del referido.
      alliedCommissionPercent: previewAllyPercent,
    });
  }, [
    state,
    billingRates,
    gateways.data,
    selectedSlugs,
    planType,
    previewAllyPercent,
  ]);

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
      if (isIndividual && parseCostNumber(state.analysisLimit) < 0) {
        return "El límite de análisis debe ser mayor o igual a 0.";
      }
      if (!isIndividual) {
        const skiniverN = parseCostNumber(state.skiniverLimit);
        const aestheticN = parseCostNumber(state.aestheticLimit);
        if (skiniverEnabled && skiniverN < 0) {
          return "El límite dermatológico debe ser mayor o igual a 0.";
        }
        if (aestheticEnabled && aestheticN < 0) {
          return "El límite estético/fototipo debe ser mayor o igual a 0.";
        }
        if (skiniverEnabled && aestheticEnabled) {
          if (skiniverN + aestheticN < 1) {
            return "Define al menos un crédito en los límites de análisis.";
          }
        } else if (skiniverEnabled && skiniverN < 1) {
          return "Define el límite de análisis dermatológico.";
        } else if (aestheticEnabled && aestheticN < 1) {
          return "Define el límite de análisis estético/fototipo.";
        }
      }
      if (parseCostNumber(state.price) < 0)
        return "El precio debe ser mayor o igual a 0.";
      if (parseCostNumber(state.durationDays) < 1)
        return "La duración debe ser al menos 1 día.";
      if (!isIndividual && parseCostNumber(state.maxUsers) < 1) {
        return "Debe permitir al menos 1 usuario.";
      }
      if (state.description.length > 300) return "La descripción no puede superar 300 caracteres.";
    }
    if (
      !isIndividual &&
      current === 2 &&
      assignedRolesTotal > parseCostNumber(state.maxUsers)
    ) {
      return `La suma de usuarios por rol (${assignedRolesTotal}) supera el máximo del plan (${state.maxUsers || 0}).`;
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
      await onSubmit(
        toPlanInput(
          state,
          planType,
          providerSlugById,
          billingRates.ivaPercentDefault,
        ),
      );
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
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej. 45"
                    className={inputClass}
                    value={state.analysisLimit}
                    onChange={(e) =>
                      setState({ ...state, analysisLimit: e.target.value })
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
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej. 100"
                      disabled={!skiniverEnabled}
                      className={cn(inputClass, !skiniverEnabled && "cursor-not-allowed bg-muted")}
                      value={skiniverEnabled ? state.skiniverLimit : ""}
                      onChange={(e) =>
                        setState({
                          ...state,
                          skiniverLimit: e.target.value,
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
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej. 45"
                      disabled={!aestheticEnabled}
                      className={cn(inputClass, !aestheticEnabled && "cursor-not-allowed bg-muted")}
                      value={aestheticEnabled ? state.aestheticLimit : ""}
                      onChange={(e) =>
                        setState({
                          ...state,
                          aestheticLimit: e.target.value,
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
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej. 630000"
                  className={inputClass}
                  value={state.price}
                  onChange={(e) => setState({ ...state, price: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">
                  {state.ivaEnabled
                    ? `Precio del plan (incluye IVA ${billingRates.ivaPercentDefault}%). Es el que se muestra en el catálogo.`
                    : "Precio del plan en el catálogo. Activa IVA para sumarlo aquí."}
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={state.ivaEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const pct = billingRates.ivaPercentDefault;
                    const current = parseCostNumber(state.price);
                    let nextPrice = state.price;
                    if (checked && !state.ivaEnabled && current > 0) {
                      nextPrice = formatIntField(
                        planCustomerPrice(current, true, pct),
                      );
                    } else if (!checked && state.ivaEnabled && current > 0) {
                      nextPrice = formatIntField(
                        stripIvaFromGross(current, pct),
                      );
                    }
                    setState({
                      ...state,
                      ivaEnabled: checked,
                      price: nextPrice,
                    });
                  }}
                />
                <span>
                  Incluir IVA ({billingRates.ivaPercentDefault}%) en el precio
                  del plan
                </span>
              </label>

              <div className="md:col-span-2 space-y-3 rounded-xl border border-border p-4">
                <div>
                  <p className="text-sm font-semibold">Costo API / tokens</p>
                  <p className="text-xs text-muted-foreground">
                    Unidades = análisis del plan × consumo por análisis (Skiniver{" "}
                    {API_UNITS_PER_ANALYSIS.skiniver}, YouCam{" "}
                    {API_UNITS_PER_ANALYSIS.youcam}, Fototipo{" "}
                    {API_UNITS_PER_ANALYSIS.fitzpatrick}). Luego × valor/unidad ×
                    TRM (dólar {billingRates.usdToCop.toLocaleString("es-CO")} /
                    euro {billingRates.eurToCop.toLocaleString("es-CO")} COP).
                  </p>
                </div>
                {selectedSlugs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Selecciona un análisis para calcular el costo de tokens.
                  </p>
                ) : (
                  <div
                    className={cn(
                      "grid gap-3",
                      selectedSlugs.length === 1
                        ? "sm:grid-cols-1 max-w-md"
                        : "sm:grid-cols-2 lg:grid-cols-3",
                    )}
                  >
                    {skiniverEnabled ? (
                      <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Skiniver (EUR)
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {apiUnitsResolved.skiniverAnalyses} análisis ×{" "}
                          {API_UNITS_PER_ANALYSIS.skiniver} ud ={" "}
                          <strong>{apiUnitsResolved.skiniverUnits}</strong>{" "}
                          unidades
                        </p>
                        <label className="flex flex-col gap-1 text-xs">
                          Unidades (auto)
                          <input
                            type="text"
                            readOnly
                            className={cn(inputClass, "cursor-not-allowed bg-muted")}
                            value={state.skiniverUnits}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs">
                          Valor / unidad (EUR)
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ej. 0.30"
                            className={inputClass}
                            value={state.skiniverUnitPrice}
                            onChange={(e) =>
                              setState({
                                ...state,
                                skiniverUnitPrice: e.target.value,
                              })
                            }
                          />
                        </label>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          ={" "}
                          {(
                            apiUnitsResolved.skiniverUnits *
                            parseCostNumber(state.skiniverUnitPrice) *
                            billingRates.eurToCop
                          ).toLocaleString("es-CO", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          COP
                        </p>
                      </div>
                    ) : null}
                    {youcamEnabled ? (
                      <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          YouCam (USD)
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {apiUnitsResolved.youcamAnalyses} análisis ×{" "}
                          {API_UNITS_PER_ANALYSIS.youcam} ud ={" "}
                          <strong>{apiUnitsResolved.youcamUnits}</strong>{" "}
                          unidades
                        </p>
                        <label className="flex flex-col gap-1 text-xs">
                          Unidades (auto)
                          <input
                            type="text"
                            readOnly
                            className={cn(inputClass, "cursor-not-allowed bg-muted")}
                            value={state.youcamUnits}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs">
                          Valor / unidad (USD)
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ej. 0.055"
                            className={inputClass}
                            value={state.youcamUnitPrice}
                            onChange={(e) =>
                              setState({
                                ...state,
                                youcamUnitPrice: e.target.value,
                              })
                            }
                          />
                        </label>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          ={" "}
                          {(
                            apiUnitsResolved.youcamUnits *
                            parseCostNumber(state.youcamUnitPrice) *
                            billingRates.usdToCop
                          ).toLocaleString("es-CO", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          COP
                        </p>
                      </div>
                    ) : null}
                    {fitzpatrickEnabled ? (
                      <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Fitzpatrick (USD)
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {apiUnitsResolved.fitzpatrickAnalyses} análisis ×{" "}
                          {API_UNITS_PER_ANALYSIS.fitzpatrick} ud ={" "}
                          <strong>{apiUnitsResolved.fitzpatrickUnits}</strong>{" "}
                          unidades
                        </p>
                        <label className="flex flex-col gap-1 text-xs">
                          Unidades (auto)
                          <input
                            type="text"
                            readOnly
                            className={cn(inputClass, "cursor-not-allowed bg-muted")}
                            value={state.fitzpatrickUnits}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs">
                          Valor / unidad (USD)
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ej. 0.055"
                            className={inputClass}
                            value={state.fitzpatrickUnitPrice}
                            onChange={(e) =>
                              setState({
                                ...state,
                                fitzpatrickUnitPrice: e.target.value,
                              })
                            }
                          />
                        </label>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          ={" "}
                          {(
                            apiUnitsResolved.fitzpatrickUnits *
                            parseCostNumber(state.fitzpatrickUnitPrice) *
                            billingRates.usdToCop
                          ).toLocaleString("es-CO", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          COP
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="rounded-lg border border-dashed border-border p-3 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      Preview liquidación
                      {providerLabels.length > 0
                        ? ` · ${providerLabels.join(", ")}`
                        : ""}
                    </p>
                    {alliedWithCommission.length > 0 ? (
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        Simular aliada
                        <select
                          className="h-7 rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground"
                          value={previewAlly?.id ?? ""}
                          onChange={(e) => setPreviewAllyId(e.target.value)}
                        >
                          {alliedWithCommission.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({o.referralCommissionPercent}%)
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    En cada venta se usa el % de comisión de la empresa aliada
                    del referido (no un fijo). Aquí se simula con{" "}
                    {previewAlly
                      ? `${previewAlly.name} (${previewAllyPercent}%)`
                      : "venta sin referido"}
                    .
                  </p>
                  <p>
                    Cobro cliente:{" "}
                    <strong>
                      ${economicsPreview.grossAmount.toLocaleString("es-CO")}
                    </strong>
                    {state.ivaEnabled
                      ? ` (incluye IVA ${billingRates.ivaPercentDefault}%)`
                      : ""}
                  </p>
                  <p>
                    − Wompi {economicsPreview.gatewayFeePercent}%: $
                    {economicsPreview.gatewayFeeAmount.toLocaleString("es-CO")}
                  </p>
                  <p>
                    − Gasto op. {economicsPreview.operationalCostPercent}%: $
                    {economicsPreview.operationalCostAmount.toLocaleString("es-CO")}
                  </p>
                  <p>
                    − Tokens API: $
                    {economicsPreview.apiTokenCostAmount.toLocaleString("es-CO")}
                  </p>
                  <p>
                    Base comisión: $
                    {economicsPreview.commissionBaseAmount.toLocaleString("es-CO")}
                  </p>
                  <p>
                    {previewAllyPercent != null
                      ? `Aliada ${previewAllyPercent}%`
                      : "Sin aliada"}
                    : $
                    {economicsPreview.alliedCommissionAmount.toLocaleString(
                      "es-CO",
                    )}{" "}
                    · Bolsa: $
                    {economicsPreview.platformNetAmount.toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">
                  Duración (días) <span className="text-destructive">*</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 30"
                  className={inputClass}
                  value={state.durationDays}
                  onChange={(e) =>
                    setState({
                      ...state,
                      durationDays: e.target.value,
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

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Color del header</p>
                <p className="text-xs text-muted-foreground">
                  Tinte de la franja superior de la card en el catálogo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLAN_HEADER_COLORS.map((color) => {
                  const selected = state.headerColor === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      title={color.label}
                      aria-label={color.label}
                      aria-pressed={selected}
                      onClick={() => setState({ ...state, headerColor: color.id })}
                      className={cn(
                        "size-9 rounded-full border-2 transition-transform",
                        selected
                          ? "scale-110 border-foreground ring-2 ring-offset-2 ring-foreground/30"
                          : "border-transparent hover:scale-105",
                      )}
                      style={{ backgroundColor: color.hex }}
                    />
                  );
                })}
              </div>
              <div
                className="overflow-hidden rounded-xl border border-border"
                aria-hidden
              >
                <div
                  className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white"
                  style={{
                    backgroundColor: resolvePlanHeaderColor(state.headerColor).hex,
                  }}
                >
                  {state.name.trim() || "Vista previa del header"}
                </div>
                <div className="bg-card px-3 py-2 text-center text-[11px] text-muted-foreground">
                  Fondo blanco · botón azul del sistema
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Virtudes del plan</p>
                  <p className="text-xs text-muted-foreground">
                    Lista con ✓ (incluido) o ✗ (no incluido) que se muestra en la card del
                    catálogo.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={state.features.length >= 12}
                  onClick={() =>
                    setState({
                      ...state,
                      features: [
                        ...state.features,
                        { label: "", included: true },
                      ],
                    })
                  }
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Añadir
                </Button>
              </div>
              {state.features.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
                  Sin virtudes aún. Añade ítems para destacar qué incluye (o no) el plan.
                </p>
              ) : (
                <ul className="space-y-2">
                  {state.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-2"
                    >
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          title="Incluido"
                          aria-label="Marcar como incluido"
                          className={cn(
                            "inline-flex size-8 items-center justify-center rounded-full border transition-colors",
                            feature.included
                              ? "border-emerald-600 bg-emerald-500 text-white"
                              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                          )}
                          onClick={() => {
                            const features = state.features.slice();
                            features[index] = { ...features[index], included: true };
                            setState({ ...state, features });
                          }}
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          title="No incluido"
                          aria-label="Marcar como no incluido"
                          className={cn(
                            "inline-flex size-8 items-center justify-center rounded-full border transition-colors",
                            !feature.included
                              ? "border-rose-600 bg-rose-500 text-white"
                              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                          )}
                          onClick={() => {
                            const features = state.features.slice();
                            features[index] = { ...features[index], included: false };
                            setState({ ...state, features });
                          }}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <input
                        className={cn(inputClass, "min-w-0 flex-1")}
                        value={feature.label}
                        onChange={(e) => {
                          const features = state.features.slice();
                          features[index] = {
                            ...features[index],
                            label: e.target.value,
                          };
                          setState({ ...state, features });
                        }}
                        placeholder="Ej. Reportes clínicos en PDF"
                        maxLength={80}
                      />
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Eliminar virtud"
                        onClick={() =>
                          setState({
                            ...state,
                            features: state.features.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {youcamEnabled ? (
              <PlanCoveragePicker
                title="Condiciones de la piel que cubre el plan"
                subtitle="Seleccione las condiciones de la piel que incluye este plan de análisis estético"
                catalog={PLAN_AESTHETIC_COVERAGE_CATALOG}
                selected={state.coverage.aesthetic}
                html={state.coverage.aestheticHtml ?? ""}
                onChange={({ items, html }) =>
                  setState((prev) => ({
                    ...prev,
                    coverage: {
                      ...prev.coverage,
                      aesthetic: items,
                      aestheticHtml: html,
                    },
                  }))
                }
              />
            ) : null}

            {skiniverEnabled ? (
              <>
                <PlanCoveragePicker
                  title="Clases dermatológicas que cubre el plan"
                  subtitle="Seleccione las clases diagnósticas incluidas en este plan dermatológico"
                  catalog={PLAN_DERM_CLASS_COVERAGE_CATALOG}
                  selected={state.coverage.dermatologyClasses}
                  html={state.coverage.dermatologyClassesHtml ?? ""}
                  onChange={({ items, html }) =>
                    setState((prev) => ({
                      ...prev,
                      coverage: {
                        ...prev.coverage,
                        dermatologyClasses: items,
                        dermatologyClassesHtml: html,
                      },
                    }))
                  }
                />
                <PlanCoveragePicker
                  title="Enfermedades dermatológicas que cubre el plan"
                  subtitle="Seleccione las enfermedades incluidas en este plan dermatológico"
                  catalog={PLAN_DERM_DISEASE_COVERAGE_CATALOG}
                  selected={state.coverage.dermatologyDiseases}
                  html={state.coverage.dermatologyDiseasesHtml ?? ""}
                  onChange={({ items, html }) =>
                    setState((prev) => ({
                      ...prev,
                      coverage: {
                        ...prev.coverage,
                        dermatologyDiseases: items,
                        dermatologyDiseasesHtml: html,
                      },
                    }))
                  }
                />
              </>
            ) : null}

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
                    }).format(parseCostNumber(state.price))}
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
          <div className="overflow-hidden rounded-xl border border-border">
            <div
              className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white"
              style={{
                backgroundColor: resolvePlanHeaderColor(state.headerColor).hex,
              }}
            >
              Header · {resolvePlanHeaderColor(state.headerColor).label}
            </div>
          </div>
          {state.features.some((f) => f.label.trim()) ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {state.features
                .filter((f) => f.label.trim())
                .map((feature, index) => (
                  <li
                    key={`${feature.label}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span
                      className={cn(
                        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-white",
                        feature.included ? "bg-emerald-500" : "bg-rose-500",
                      )}
                    >
                      {feature.included ? (
                        <Check className="size-3" />
                      ) : (
                        <X className="size-3" />
                      )}
                    </span>
                    <span className={feature.included ? "" : "text-muted-foreground"}>
                      {feature.label}
                    </span>
                  </li>
                ))}
            </ul>
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
