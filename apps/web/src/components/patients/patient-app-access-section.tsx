import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { ModuleCard, ModuleCardDescription, ModuleCardTitle } from "@/components/ui/module-card";
import { PasswordRequirements } from "@/components/ui/password-requirements";
import { cn } from "@/lib/utils";
import { FormField, inputClass } from "./patient-form-fields";
import type { PatientFormValues } from "./patient-form-schema";

/** Solo en el alta: crear la cuenta de la app con el correo del paciente. */
export function PatientAppAccessSection({
  control,
  register,
  errors,
}: {
  control: Control<PatientFormValues>;
  register: UseFormRegister<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const createAppAccess = useWatch({ control, name: "createAppAccess" });
  const passwordValue = useWatch({ control, name: "password" });

  return (
    <ModuleCard className="space-y-5 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <ModuleCardTitle>Acceso a la app</ModuleCardTitle>
          <ModuleCardDescription className="mt-1">
            Si lo activas, el paciente podrá iniciar sesión en Piel360 con correo y contraseña.
          </ModuleCardDescription>
        </div>
        <Controller
          name="createAppAccess"
          control={control}
          render={({ field }) => (
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
              Crear cuenta
            </label>
          )}
        />
      </div>

      {createAppAccess ? (
        <FormField label="Contraseña" id="password" required error={errors.password?.message}>
          <div className="relative max-w-sm">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className={cn(inputClass, "pr-10")}
              {...register("password", {
                onBlur: () => setPasswordFocused(false),
              })}
              onFocus={() => setPasswordFocused(true)}
            />
            <button
              type="button"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
            {passwordFocused && passwordValue ? (
              <PasswordRequirements password={passwordValue} />
            ) : null}
          </div>
        </FormField>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          El paciente se registrará solo en tu cartera. Podrás añadir acceso a la app más adelante
          desde su perfil.
        </p>
      )}
    </ModuleCard>
  );
}
