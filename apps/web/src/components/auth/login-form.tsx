"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Role } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import { loginAction, type AuthActionState } from "@/lib/actions/auth";
import { TextField } from "./text-field";

const initialState: AuthActionState = {};

export function LoginForm({
  role,
  registerHref,
}: {
  role: Role;
  registerHref?: string;
}) {
  const boundAction = loginAction.bind(null, role);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <TextField label="Email" id="email" name="email" type="email" required autoComplete="email" />
      <TextField
        label="Contraseña"
        id="password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="current-password"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Ingresando..." : "Ingresar"}
      </Button>
      {registerHref && (
        <p className="text-center text-sm text-zinc-500">
          ¿No tienes cuenta?{" "}
          <Link href={registerHref} className="underline">
            Regístrate
          </Link>
        </p>
      )}
    </form>
  );
}
