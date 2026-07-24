"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { useAdminPlans } from "@/lib/queries/plans";
import type { SubscriptionAdmin, SubscriptionInput } from "@/lib/queries/subscriptions";
import { useUsers } from "@/lib/queries/users";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "active", label: "Activo" },
  { value: "cancelled", label: "Cancelado" },
] as const;

const subscriptionSchema = z.object({
  userId: z.string().min(1, "Requerido"),
  planId: z.string().min(1, "Requerido"),
  status: z.enum(["pending", "active", "cancelled"]),
  endsAt: z.string(),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

function toInput(values: SubscriptionFormValues): SubscriptionInput {
  return {
    userId: values.userId,
    planId: values.planId,
    status: values.status,
    endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
  };
}

// <input type="date"> necesita YYYY-MM-DD, no el ISO completo.
function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function SubscriptionForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: SubscriptionAdmin;
  onSubmit: (input: SubscriptionInput) => Promise<unknown>;
  submitLabel: string;
}) {
  const users = useUsers();
  const plans = useAdminPlans();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      userId: defaultValues?.user.id ?? "",
      planId: defaultValues?.plan.id ?? "",
      status: defaultValues?.status ?? "pending",
      endsAt: toDateInputValue(defaultValues?.endsAt ?? null),
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toInput(values));
    } catch (err) {
      setError("root", {
        message: err instanceof ApiError ? err.message : "No se pudo guardar la suscripción.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="userId" className="text-sm font-medium">
          Usuario
        </label>
        <select
          id="userId"
          {...register("userId")}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Selecciona un usuario
          </option>
          {users.data?.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} — {user.email}
            </option>
          ))}
        </select>
        {errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="planId" className="text-sm font-medium">
          Plan
        </label>
        <select
          id="planId"
          {...register("planId")}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Selecciona un plan
          </option>
          {plans.data?.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} ({plan.provider.name})
            </option>
          ))}
        </select>
        {errors.planId && <p className="text-sm text-destructive">{errors.planId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            Estado
          </label>
          <select
            id="status"
            {...register("status")}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="endsAt" className="text-sm font-medium">
            Finaliza el
          </label>
          <input
            id="endsAt"
            type="date"
            {...register("endsAt")}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
