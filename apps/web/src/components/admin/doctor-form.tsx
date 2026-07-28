"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import type { Doctor, DoctorInput } from "@/lib/queries/doctors";

// Espejo de UpdateDoctorDto (apps/api/src/doctors/dto/update-doctor.dto.ts) —
// birthDate/gender no están en el DTO todavía, así que no se editan acá.
const doctorSchema = z.object({
  firstName: z.string().min(1, "Requerido"),
  lastName: z.string().min(1, "Requerido"),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  country: z.string(),
  zip: z.string(),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

function toInput(values: DoctorFormValues): DoctorInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone || undefined,
    address: values.address || undefined,
    city: values.city || undefined,
    country: values.country || undefined,
    zip: values.zip || undefined,
  };
}

export function DoctorForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Doctor;
  onSubmit: (input: DoctorInput) => Promise<unknown>;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      phone: defaultValues?.phone ?? "",
      address: defaultValues?.address ?? "",
      city: defaultValues?.city ?? "",
      country: defaultValues?.country ?? "",
      zip: defaultValues?.zip ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toInput(values));
    } catch (err) {
      setError("root", {
        message: err instanceof ApiError ? err.message : "No se pudo guardar el doctor.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Nombre" id="firstName" {...register("firstName")} />
        <TextField label="Apellidos" id="lastName" {...register("lastName")} />
      </div>
      {(errors.firstName || errors.lastName) && (
        <p className="text-sm text-destructive">
          {errors.firstName?.message ?? errors.lastName?.message}
        </p>
      )}

      <TextField label="Teléfono" id="phone" {...register("phone")} />

      <div className="grid grid-cols-2 gap-4">
        <TextField label="Ciudad" id="city" {...register("city")} />
        <TextField label="País" id="country" {...register("country")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField label="Dirección" id="address" {...register("address")} />
        <TextField label="Código postal" id="zip" {...register("zip")} />
      </div>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
