"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { Patient, PatientInput } from "@/lib/queries/patients";
import {
  PATIENT_DOC_TYPES,
  PATIENT_FITZ_OPTIONS,
  PATIENT_GENDER_OPTIONS,
  PATIENT_MASCOT_OPTIONS,
  PATIENT_SKIN_OPTIONS,
} from "@/lib/patient-form-options";

// Espejo de CreatePatientDto + campos del form mobile (CreatePatientForm).
const patientSchema = z.object({
  firstName: z.string().min(1, "Requerido"),
  lastName: z.string().min(1, "Requerido"),
  email: z.union([z.literal(""), z.string().email("Email inválido")]),
  docType: z.string(),
  docNumber: z.string(),
  gender: z.string(),
  address: z.string(),
  areaCode: z.string(),
  phone: z.string(),
  birthDate: z.union([
    z.literal(""),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa AAAA-MM-DD"),
  ]),
  mascotType: z.string(),
  skinType: z.string(),
  fitzpatrickType: z.string(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function opt(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
}

function toInput(values: PatientFormValues): PatientInput {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: opt(values.email),
    docType: opt(values.docType),
    docNumber: opt(values.docNumber),
    gender: opt(values.gender),
    address: opt(values.address),
    areaCode: opt(values.areaCode),
    phone: opt(values.phone),
    birthDate: opt(values.birthDate),
    mascotType: opt(values.mascotType),
    skinType: opt(values.skinType),
    fitzpatrickType: opt(values.fitzpatrickType),
  };
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(active ? "" : o.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-border bg-background hover:bg-muted",
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
}: {
  defaultValues?: Patient;
  onSubmit: (input: PatientInput) => Promise<unknown>;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      docType: defaultValues?.docType ?? "CC",
      docNumber: defaultValues?.docNumber ?? "",
      gender: defaultValues?.gender ?? "",
      address: defaultValues?.address ?? "",
      areaCode: defaultValues?.areaCode ?? "+57",
      phone: defaultValues?.phone ?? "",
      birthDate: toDateInput(defaultValues?.birthDate),
      mascotType: defaultValues?.mascotType ?? "",
      skinType: defaultValues?.skinType ?? "",
      fitzpatrickType: defaultValues?.fitzpatrickType ?? "",
    },
  });

  const fitz = watch("fitzpatrickType");
  const fitzHint = PATIENT_FITZ_OPTIONS.find((f) => f.value === fitz)?.hint;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toInput(values));
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
    <form onSubmit={submit} className="max-w-lg space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Nombres" id="firstName" {...register("firstName")} />
        <TextField label="Apellidos" id="lastName" {...register("lastName")} />
      </div>
      {(errors.firstName || errors.lastName) && (
        <p className="text-sm text-destructive">
          {errors.firstName?.message ?? errors.lastName?.message}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Tipo identificación</p>
        <Controller
          name="docType"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {PATIENT_DOC_TYPES.map((d) => {
                const active = field.value === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => field.onChange(d)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-border bg-background hover:bg-muted",
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      <TextField
        label="No. Identificación"
        id="docNumber"
        {...register("docNumber")}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium">Sexo</p>
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
      </div>

      <TextField label="Dirección" id="address" {...register("address")} />

      <div className="grid grid-cols-[90px_1fr] gap-4">
        <TextField label="Cód. área" id="areaCode" {...register("areaCode")} />
        <TextField label="Teléfono" id="phone" type="tel" {...register("phone")} />
      </div>

      <TextField
        label="Fecha de nacimiento (AAAA-MM-DD)"
        id="birthDate"
        placeholder="1976-06-12"
        {...register("birthDate")}
      />
      {errors.birthDate && (
        <p className="text-sm text-destructive">{errors.birthDate.message}</p>
      )}

      <TextField label="Email" id="email" type="email" {...register("email")} />
      {errors.email && (
        <p className="text-sm text-destructive">{errors.email.message}</p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Mascota</p>
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
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Tipo de piel</p>
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
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Fototipo Fitzpatrick</p>
        <Controller
          name="fitzpatrickType"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {PATIENT_FITZ_OPTIONS.map((f) => {
                const active = field.value === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    title={f.hint}
                    aria-label={`Fototipo ${f.value}`}
                    onClick={() =>
                      field.onChange(active ? "" : f.value)
                    }
                    className={cn(
                      "size-8 rounded-full border-2 transition-shadow",
                      active
                        ? "border-foreground ring-2 ring-sky-500 ring-offset-2"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: f.color }}
                  />
                );
              })}
            </div>
          )}
        />
        {fitzHint ? (
          <p className="text-xs text-muted-foreground">{fitzHint}</p>
        ) : null}
      </div>

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
