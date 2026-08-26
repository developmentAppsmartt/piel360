"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createModeratorAction,
  type CreateModeratorState,
} from "@/lib/actions/moderators";

const DOC_TYPES = ["CC", "CE", "TI", "PA"] as const;

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

const initialState: CreateModeratorState = {};

export function CreateModeratorForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createModeratorAction,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <input
            className={inputClass}
            name="firstName"
            required
            autoComplete="off"
          />
        </Field>
        <Field label="Apellidos">
          <input
            className={inputClass}
            name="lastName"
            required
            autoComplete="off"
          />
        </Field>
        <Field label="Tipo de documento">
          <select className={inputClass} name="docType" defaultValue="CC">
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Número de documento">
          <input className={inputClass} name="docNumber" autoComplete="off" />
        </Field>
        <Field label="Teléfono">
          <input
            className={inputClass}
            name="phone"
            type="tel"
            placeholder="573001112233"
            autoComplete="off"
          />
        </Field>
        <Field label="Correo">
          <input
            className={inputClass}
            name="email"
            type="email"
            required
            autoComplete="off"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Contraseña temporal">
            <input
              className={inputClass}
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Crear moderador"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/moderadores")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
