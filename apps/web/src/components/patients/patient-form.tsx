"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { AddressLocationPicker } from "@/components/maps";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardDescription, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import {
  PATIENT_BIRTH_TYPE_OPTIONS,
  PATIENT_DOC_TYPES,
  PATIENT_EXERCISE_DAYS_OPTIONS,
  PATIENT_EXERCISE_DURATION_OPTIONS,
  PATIENT_EXERCISE_HABIT_OPTIONS,
  PATIENT_FITZ_OPTIONS,
  PATIENT_GENDER_OPTIONS,
  PATIENT_MASCOT_OPTIONS,
  PATIENT_SKIN_OPTIONS,
} from "@/lib/patient-form-options";
import type { Patient, PatientInput } from "@/lib/queries/patients";
import { chronologicalAgeYears } from "@/lib/skin-age";
import { cn } from "@/lib/utils";

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

function toCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function createPatientSchema(isCreate: boolean) {
  return z
    .object({
      firstName: z.string().min(1, "Requerido"),
      lastName: z.string().min(1, "Requerido"),
      email: z.union([z.literal(""), z.string().email("Email inválido")]),
      password: z.string(),
      createAppAccess: z.boolean(),
      docType: z.string(),
      docNumber: z.string(),
      gender: z.string(),
      address: z.string(),
      lat: z.number().nullable(),
      lng: z.number().nullable(),
      areaCode: z.string(),
      phone: z.string(),
      birthDate: z.union([
        z.literal(""),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
      ]),
      mascotType: z.string(),
      birthType: z.string(),
      exerciseHabit: z.string(),
      exerciseDaysPerWeek: z.string(),
      exerciseSessionDuration: z.string(),
      skinType: z.string(),
      fitzpatrickType: z.string(),
    })
    .superRefine((values, ctx) => {
      if (!isCreate || !values.createAppAccess) return;
      const email = values.email.trim();
      const password = values.password.trim();
      if (!email) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Correo requerido para crear acceso",
        });
      }
      if (password.length < 8) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "Mínimo 8 caracteres",
        });
      }
    });
}

type PatientFormValues = z.infer<ReturnType<typeof createPatientSchema>>;

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function opt(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
}

function toInput(values: PatientFormValues, isCreate: boolean): PatientInput {
  const includeAccess = isCreate && values.createAppAccess;
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: includeAccess ? opt(values.email) : undefined,
    ...(includeAccess ? { password: opt(values.password) } : {}),
    docType: opt(values.docType),
    docNumber: opt(values.docNumber),
    gender: opt(values.gender),
    address: opt(values.address),
    ...(values.lat != null && values.lng != null
      ? { lat: values.lat, lng: values.lng }
      : {}),
    areaCode: opt(values.areaCode),
    phone: opt(values.phone),
    birthDate: opt(values.birthDate),
    birthType: opt(values.birthType),
    mascotType: opt(values.mascotType),
    exerciseHabit: opt(values.exerciseHabit),
    exerciseDaysPerWeek: opt(values.exerciseDaysPerWeek),
    exerciseSessionDuration: opt(values.exerciseSessionDuration),
    skinType: opt(values.skinType),
    fitzpatrickType: opt(values.fitzpatrickType),
  };
}

function FormField({
  label,
  id,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  id?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  allowClear = true,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  allowClear?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(active && allowClear ? "" : o.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/50",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function PatientForm({
  defaultValues,
  onSubmit,
  submitLabel,
  onCancel,
}: {
  defaultValues?: Patient;
  onSubmit: (input: PatientInput) => Promise<unknown>;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const isCreate = !defaultValues;
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(createPatientSchema(isCreate)),
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      password: "",
      createAppAccess: false,
      docType: defaultValues?.docType ?? "CC",
      docNumber: defaultValues?.docNumber ?? "",
      gender: defaultValues?.gender ?? "",
      address: defaultValues?.address ?? "",
      lat: toCoord(defaultValues?.lat),
      lng: toCoord(defaultValues?.lng),
      areaCode: defaultValues?.areaCode ?? "+57",
      phone: defaultValues?.phone ?? "",
      birthDate: toDateInput(defaultValues?.birthDate),
      birthType: defaultValues?.birthType ?? "",
      mascotType: defaultValues?.mascotType ?? "",
      exerciseHabit: defaultValues?.exerciseHabit ?? "",
      exerciseDaysPerWeek: defaultValues?.exerciseDaysPerWeek ?? "",
      exerciseSessionDuration: defaultValues?.exerciseSessionDuration ?? "",
      skinType: defaultValues?.skinType ?? "",
      fitzpatrickType: defaultValues?.fitzpatrickType ?? "",
    },
  });

  const fitz = watch("fitzpatrickType");
  const createAppAccess = watch("createAppAccess");
  const birthDateValue = watch("birthDate");
  const addressValue = watch("address");
  const latValue = watch("lat");
  const lngValue = watch("lng");
  const chronologicalAge = chronologicalAgeYears(birthDateValue || null, new Date());
  const fitzHint = PATIENT_FITZ_OPTIONS.find((f) => f.value === fitz)?.hint;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toInput(values, isCreate));
    } catch (err) {
      setError("root", {
        message:
          err instanceof ApiError
            ? Array.isArray(err.message)
              ? err.message.join(", ")
              : err.message
            : "No se pudo guardar el paciente.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <ModuleCard className="space-y-5 p-5 sm:p-6">
        <div>
          <ModuleCardTitle>Datos personales</ModuleCardTitle>
          <ModuleCardDescription className="mt-1">
            Información de identificación y contacto básica del paciente.
          </ModuleCardDescription>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombres" id="firstName" required error={errors.firstName?.message}>
            <input id="firstName" className={inputClass} {...register("firstName")} />
          </FormField>
          <FormField label="Apellidos" id="lastName" required error={errors.lastName?.message}>
            <input id="lastName" className={inputClass} {...register("lastName")} />
          </FormField>
        </div>

        <FormField label="Tipo de identificación" id="docType">
          <Controller
            name="docType"
            control={control}
            render={({ field }) => (
              <ChipGroup
                options={PATIENT_DOC_TYPES.map((d) => ({ value: d, label: d }))}
                value={field.value}
                onChange={field.onChange}
                allowClear={false}
              />
            )}
          />
        </FormField>

        <FormField label="Número de identificación" id="docNumber">
          <input id="docNumber" className={inputClass} {...register("docNumber")} />
        </FormField>

        <FormField label="Sexo" id="gender">
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <ChipGroup
                options={PATIENT_GENDER_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>

        <FormField
          label="Fecha de nacimiento"
          id="birthDate"
          hint={
            chronologicalAge != null
              ? `Edad cronológica: ${chronologicalAge} años. Se usa en el análisis de salud de la piel y en el CRM.`
              : "Se usa como edad cronológica en el análisis de salud de la piel y en el CRM."
          }
          error={errors.birthDate?.message}
        >
          <input id="birthDate" type="date" className={inputClass} {...register("birthDate")} />
        </FormField>

        <FormField label="Tipo de nacimiento" id="birthType">
          <Controller
            name="birthType"
            control={control}
            render={({ field }) => (
              <ChipGroup
                options={PATIENT_BIRTH_TYPE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
      </ModuleCard>

      <ModuleCard className="space-y-5 p-5 sm:p-6">
        <div>
          <ModuleCardTitle>Contacto</ModuleCardTitle>
          <ModuleCardDescription className="mt-1">
            Ubicación en el mapa y teléfono para comunicación con el paciente.
          </ModuleCardDescription>
        </div>

        <AddressLocationPicker
          value={{
            address: addressValue,
            lat: latValue,
            lng: lngValue,
          }}
          onChange={(next) => {
            setValue("address", next.address, { shouldDirty: true });
            setValue("lat", next.lat, { shouldDirty: true });
            setValue("lng", next.lng, { shouldDirty: true });
          }}
        />

        <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
          <FormField label="Indicativo" id="areaCode">
            <input id="areaCode" className={inputClass} {...register("areaCode")} />
          </FormField>
          <FormField label="Teléfono" id="phone">
            <input id="phone" type="tel" className={inputClass} {...register("phone")} />
          </FormField>
        </div>
      </ModuleCard>

      {isCreate ? (
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
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Correo electrónico" id="email" required error={errors.email?.message}>
                <input id="email" type="email" autoComplete="email" className={inputClass} {...register("email")} />
              </FormField>
              <FormField
                label="Contraseña"
                id="password"
                required
                hint="Mínimo 8 caracteres."
                error={errors.password?.message}
              >
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={cn(inputClass, "pr-10")}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FormField>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              El paciente se registrará solo en tu cartera. Podrás añadir acceso a la app más adelante
              desde su perfil.
            </p>
          )}
        </ModuleCard>
      ) : (
        <ModuleCard className="space-y-4 p-5 sm:p-6">
          <div>
            <ModuleCardTitle>Correo electrónico</ModuleCardTitle>
            <ModuleCardDescription className="mt-1">
              Actualiza el correo de contacto del paciente.
            </ModuleCardDescription>
          </div>
          <FormField label="Correo" id="email" error={errors.email?.message}>
            <input id="email" type="email" className={inputClass} {...register("email")} />
          </FormField>
        </ModuleCard>
      )}

      <ModuleCard className="space-y-5 p-5 sm:p-6">
        <div>
          <ModuleCardTitle>Perfil dermatológico</ModuleCardTitle>
          <ModuleCardDescription className="mt-1">
            Datos opcionales que ayudan a personalizar análisis y recomendaciones.
          </ModuleCardDescription>
        </div>

        <FormField label="Mascota en el hogar" id="mascotType">
          <Controller
            name="mascotType"
            control={control}
            render={({ field }) => (
              <ChipGroup
                options={PATIENT_MASCOT_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>

        <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Actividad física</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Datos opcionales sobre ejercicio o deporte regular.
            </p>
          </div>
          <FormField
            label="¿Realiza algún tipo de ejercicio o deporte de forma regular?"
            id="exerciseHabit"
          >
            <Controller
              name="exerciseHabit"
              control={control}
              render={({ field }) => (
                <ChipGroup
                  options={PATIENT_EXERCISE_HABIT_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>
          <FormField
            label="¿Cuántos días a la semana dedica a estas actividades?"
            id="exerciseDaysPerWeek"
          >
            <Controller
              name="exerciseDaysPerWeek"
              control={control}
              render={({ field }) => (
                <ChipGroup
                  options={PATIENT_EXERCISE_DAYS_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>
          <FormField
            label="¿Cuánto tiempo dura cada sesión de entrenamiento?"
            id="exerciseSessionDuration"
          >
            <Controller
              name="exerciseSessionDuration"
              control={control}
              render={({ field }) => (
                <ChipGroup
                  options={PATIENT_EXERCISE_DURATION_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>
        </div>

        <FormField label="Tipo de piel" id="skinType">
          <Controller
            name="skinType"
            control={control}
            render={({ field }) => (
              <ChipGroup
                options={PATIENT_SKIN_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>

        <FormField
          label="Fototipo Fitzpatrick"
          id="fitzpatrickType"
          hint={fitzHint ?? "Selecciona el tono más cercano al del paciente."}
        >
          <Controller
            name="fitzpatrickType"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-3">
                {PATIENT_FITZ_OPTIONS.map((f) => {
                  const active = field.value === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      title={f.hint}
                      aria-label={`Fototipo ${f.value}`}
                      onClick={() => field.onChange(active ? "" : f.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors",
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "border-border hover:border-primary/30",
                      )}
                    >
                      <span
                        className="size-9 rounded-full border border-black/10 shadow-inner"
                        style={{ backgroundColor: f.color }}
                      />
                      <span className="text-xs font-medium text-muted-foreground">{f.value}</span>
                    </button>
                  );
                })}
              </div>
            )}
          />
        </FormField>
      </ModuleCard>

      {errors.root ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting} className="sm:min-w-40">
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
