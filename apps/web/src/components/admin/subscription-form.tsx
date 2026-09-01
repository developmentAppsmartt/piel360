"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PlanTeamFeaturesBlock } from "@/components/payments/plan-features-display";
import { ApiError } from "@/lib/api-error";
import { useAdminPlans } from "@/lib/queries/plans";
import type { SubscriptionAdmin, SubscriptionInput } from "@/lib/queries/subscriptions";
import { useUsers } from "@/lib/queries/users";
import {
  subscriptionPackageSummary,
  subscriptionProviderLabels,
  userMatchesPlanType,
} from "@/lib/subscription-admin-display";
import {
  resolveUserAccountKind,
  USER_ACCOUNT_KIND_LABELS,
} from "@/lib/user-account-kind";

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "cancelled", label: "Cancelado" },
] as const;

const createSchema = z.object({
  userId: z.string().min(1, "Selecciona el usuario titular de la suscripción"),
  planId: z.string().min(1, "Selecciona el paquete comprado"),
  status: z.enum(["active", "cancelled"]),
});

const editSchema = z.object({
  status: z.enum(["active", "cancelled"]),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

function formatEndsAtPreview(durationDays: number): string {
  const ends = new Date();
  ends.setDate(ends.getDate() + durationDays);
  return ends.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toInput(values: CreateFormValues): SubscriptionInput {
  return {
    userId: values.userId,
    planId: values.planId,
    status: values.status,
  };
}

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

function PurchasedPackageCard({ plan }: { plan: SubscriptionAdmin["plan"] }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Paquete adquirido
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{plan.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {subscriptionPackageSummary(plan)}
        </p>
      </div>
      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p>
          Tipo:{" "}
          <span className="font-medium text-foreground">
            {plan.planType === "business" ? "Empresarial" : "Individual"}
          </span>
        </p>
        <p>
          Análisis incluidos:{" "}
          <span className="font-medium text-foreground">{plan.analysisLimit}</span>
        </p>
        <p>
          Duración:{" "}
          <span className="font-medium text-foreground">{plan.durationDays} días</span>
        </p>
        <p>
          Proveedores:{" "}
          <span className="font-medium text-foreground">
            {subscriptionProviderLabels(plan) || "—"}
          </span>
        </p>
      </div>
      {plan.planType === "business" ? (
        <PlanTeamFeaturesBlock
          plan={{
            maxUsers: plan.maxUsers,
            modules: plan.modules,
            roleLimits: plan.roleLimits,
          }}
          compact
        />
      ) : null}
    </div>
  );
}

export function SubscriptionForm({
  mode = "create",
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  mode?: "create" | "edit";
  defaultValues?: SubscriptionAdmin;
  onSubmit: (input: SubscriptionInput) => Promise<unknown>;
  submitLabel: string;
}) {
  const users = useUsers();
  const plans = useAdminPlans();
  const isEdit = mode === "edit" && Boolean(defaultValues);

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      userId: "",
      planId: "",
      status: "active",
    },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      status:
        defaultValues?.status === "cancelled" ? "cancelled" : "active",
    },
  });

  useEffect(() => {
    if (!isEdit || !defaultValues) return;
    editForm.reset({
      status:
        defaultValues.status === "cancelled" ? "cancelled" : "active",
    });
  }, [defaultValues, editForm, isEdit]);

  const selectedPlanId = useWatch({
    control: createForm.control,
    name: "planId",
  });

  const selectedPlan = useMemo(() => {
    return plans.data?.find((plan) => plan.id === selectedPlanId) ?? null;
  }, [plans.data, selectedPlanId]);

  const eligibleUsers = useMemo(() => {
    const rows = (users.data ?? []).filter((user) => user.doctor || user.patient);
    if (!selectedPlan) return rows;
    return rows.filter((user) =>
      userMatchesPlanType(resolveUserAccountKind(user), selectedPlan.planType ?? "business"),
    );
  }, [users.data, selectedPlan]);

  const onCreateSubmit = createForm.handleSubmit(async (values) => {
    const plan = plans.data?.find((row) => row.id === values.planId);
    const user = users.data?.find((row) => row.id === values.userId);
    if (!plan || !user) {
      createForm.setError("root", {
        message: "Usuario o plan no válido. Recarga la página e inténtalo de nuevo.",
      });
      return;
    }
    const accountKind = resolveUserAccountKind(user);
    if (!userMatchesPlanType(accountKind, plan.planType ?? "business")) {
      createForm.setError("root", {
        message:
          plan.planType === "business"
            ? "Los planes empresariales solo pueden asignarse a cuentas de empresa."
            : "Este plan individual no puede asignarse a una cuenta de empresa.",
      });
      return;
    }
    try {
      await onSubmit(toInput(values));
    } catch (err) {
      createForm.setError("root", {
        message: err instanceof ApiError ? err.message : "No se pudo guardar la suscripción.",
      });
    }
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!defaultValues) return;
    try {
      await onSubmit({ status: values.status });
    } catch (err) {
      editForm.setError("root", {
        message: err instanceof ApiError ? err.message : "No se pudo guardar la suscripción.",
      });
    }
  });

  if (isEdit && defaultValues) {
    const {
      register,
      formState: { errors, isSubmitting },
    } = editForm;

    const isPendingPayment = defaultValues.status === "pending";

    return (
      <form onSubmit={onEditSubmit} className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Titular de la suscripción
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{defaultValues.user.name}</p>
          <p className="text-sm text-foreground">{defaultValues.user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {defaultValues.user.accountKindLabel}
          </p>
        </div>

        <PurchasedPackageCard plan={defaultValues.plan} />

        {isPendingPayment ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Pago pendiente con Wompi. Puedes activarla manualmente si el pago ya se confirmó
            fuera del webhook; al activar se descontarán los créditos del plan de la bolsa global.
          </p>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            Estado
          </label>
          <select id="status" {...register("status")} className={inputClass}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Finaliza el</p>
          <p className="mt-0.5 font-medium text-foreground">
            {defaultValues.endsAt
              ? new Date(defaultValues.endsAt).toLocaleDateString("es-CO")
              : formatEndsAtPreview(defaultValues.plan.durationDays)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Calculado según la duración del plan ({defaultValues.plan.durationDays} días).
          </p>
        </div>

        {defaultValues.wompiTransactionId ? (
          <p className="text-xs text-muted-foreground">
            Referencia Wompi:{" "}
            <span className="font-mono">{defaultValues.wompiTransactionId}</span>
          </p>
        ) : null}

        {errors.root ? <p className="text-sm text-destructive">{errors.root.message}</p> : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
      </form>
    );
  }

  const {
    register,
    formState: { errors, isSubmitting },
  } = createForm;

  return (
    <form onSubmit={onCreateSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="planId" className="text-sm font-medium">
          Paquete
        </label>
        <select id="planId" {...register("planId")} className={inputClass}>
          <option value="" disabled>
            Selecciona el paquete comprado
          </option>
          {plans.data?.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {subscriptionPackageSummary(plan as SubscriptionAdmin["plan"])}
            </option>
          ))}
        </select>
        {errors.planId ? <p className="text-sm text-destructive">{errors.planId.message}</p> : null}
        {selectedPlan ? <PurchasedPackageCard plan={selectedPlan as SubscriptionAdmin["plan"]} /> : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="userId" className="text-sm font-medium">
          Usuario titular
        </label>
        <select id="userId" {...register("userId")} className={inputClass}>
          <option value="" disabled>
            Selecciona empresa o profesional
          </option>
          {eligibleUsers.map((user) => {
            const accountKind = resolveUserAccountKind(user);
            return (
              <option key={user.id} value={user.id}>
                {user.name} — {user.email} ({USER_ACCOUNT_KIND_LABELS[accountKind]})
              </option>
            );
          })}
        </select>
        {errors.userId ? <p className="text-sm text-destructive">{errors.userId.message}</p> : null}
        {selectedPlan && eligibleUsers.length === 0 ? (
          <p className="text-sm text-amber-700">
            No hay usuarios compatibles con este paquete. Verifica que exista una cuenta de empresa
            o profesional con el tipo correcto.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium">
          Estado
        </label>
        <select id="status" {...register("status")} className={inputClass}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Por defecto queda activa y se descuentan los análisis del plan de la bolsa global.
        </p>
      </div>

      {selectedPlan ? (
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Finalizará el</p>
          <p className="mt-0.5 font-medium text-foreground">
            {formatEndsAtPreview(selectedPlan.durationDays)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Según duración del plan ({selectedPlan.durationDays} días desde la activación).
          </p>
        </div>
      ) : null}

      {errors.root ? <p className="text-sm text-destructive">{errors.root.message}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
