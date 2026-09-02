"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Role } from "@piel360/shared";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { loginAction, type AuthActionState } from "@/lib/actions/auth";
import { googleOAuthRole } from "@/lib/google-auth";
import { GoogleContinueButton } from "./google-continue-button";
import { LoginIconField } from "./login-icon-field";

const initialState: AuthActionState = {};

export function LoginForm({
  role,
  registerHref,
  showForgotPassword = true,
}: {
  role: Role;
  registerHref?: string;
  showForgotPassword?: boolean;
}) {
  const boundAction = loginAction.bind(null, role);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const oauthRole = googleOAuthRole(role);

  return (
    <form action={formAction} className="w-full space-y-5">
      <LoginIconField
        label="Correo electrónico"
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="Ingresa tu correo electrónico"
        icon={Mail}
      />
      <LoginIconField
        label="Contraseña"
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        required
        minLength={8}
        autoComplete="current-password"
        placeholder="Ingresa tu contraseña"
        icon={Lock}
        endAdornment={
          <>
            <Lock className="size-4 shrink-0" aria-hidden />
            <button
              type="button"
              className="pointer-events-auto rounded p-0.5 text-slate-400 hover:text-slate-600"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="inline-flex items-center gap-2 text-slate-600">
          <input
            type="checkbox"
            name="remember"
            className="size-4 rounded border-slate-300 text-primary focus:ring-primary/30"
          />
          Recordarme
        </label>
        {showForgotPassword ? (
          <span className="text-primary">¿Olvidaste tu contraseña?</span>
        ) : null}
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5b4fd4] via-[#1e5a9e] to-[#3b82c4] text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
      >
        {isPending ? "Ingresando..." : "Ingresar"}
        <ArrowRight className="size-4" aria-hidden />
      </button>

      {oauthRole ? (
        <>
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">o continúa con</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <GoogleContinueButton role={oauthRole} />
        </>
      ) : null}

      {registerHref ? (
        <p className="text-center text-sm text-slate-500">
          ¿No tienes cuenta?{" "}
          <Link href={registerHref} className="font-medium text-primary underline-offset-2 hover:underline">
            Regístrate
          </Link>
        </p>
      ) : null}
    </form>
  );
}
