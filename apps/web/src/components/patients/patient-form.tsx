"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import type { Patient, PatientInput } from "@/lib/queries/patients";

// Espejo de CreatePatientDto/UpdatePatientDto (apps/api/src/patients/dto).
const patientSchema = z.object({
  firstName: z.string().min(1, "Requerido"),
  lastName: z.string().min(1, "Requerido"),
  email: z.union([z.literal(""), z.string().email("Email inválido")]),
  phone: z.string(),
  docType: z.string(),
  docNumber: z.string(),
  address: z.string(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

function toInput(values: PatientFormValues): PatientInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email || undefined,
    phone: values.phone || undefined,
    docType: values.docType || undefined,
    docNumber: values.docNumber || undefined,
    address: values.address || undefined,
  };
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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      docType: defaultValues?.docType ?? "",
      docNumber: defaultValues?.docNumber ?? "",
      address: defaultValues?.address ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toInput(values));
    } catch (err) {
      setError("root", {
        message: err instanceof ApiError ? err.message : "No se pudo guardar el paciente.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Nombre" id="firstName" {...register("firstName")} />
        <TextField label="Apellido" id="lastName" {...register("lastName")} />
      </div>
      {(errors.firstName || errors.lastName) && (
        <p className="text-sm text-destructive">
          {errors.firstName?.message ?? errors.lastName?.message}
        </p>
      )}

      <TextField label="Email" id="email" type="email" {...register("email")} />
      {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}

      <TextField label="Teléfono" id="phone" {...register("phone")} />

      <div className="grid grid-cols-2 gap-4">
        <TextField label="Tipo de documento" id="docType" {...register("docType")} />
        <TextField label="Número de documento" id="docNumber" {...register("docNumber")} />
      </div>

      <TextField label="Dirección" id="address" {...register("address")} />

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
