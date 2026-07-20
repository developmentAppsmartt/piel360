"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { registerAction, type AuthActionState } from "@/lib/actions/auth";
import { TextField } from "./text-field";

const initialState: AuthActionState = {};

export function RegisterForm({
  role,
  loginHref,
}: {
  role: "doctor" | "patient";
  loginHref: string;
}) {
  const boundAction = registerAction.bind(null, role);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Nombre" id="firstName" name="firstName" required autoComplete="given-name" />
        <TextField label="Apellido" id="lastName" name="lastName" required autoComplete="family-name" />
      </div>
      <TextField label="Email" id="email" name="email" type="email" required autoComplete="email" />
      <TextField
        label="Contraseña"
        id="password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
      <p className="text-center text-sm text-zinc-500">
        ¿Ya tienes cuenta?{" "}
        <Link href={loginHref} className="underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
