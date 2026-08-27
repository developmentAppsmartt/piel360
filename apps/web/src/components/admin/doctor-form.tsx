"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AddressLocationPicker } from "@/components/maps";
import type { AddressLocationValue } from "@/components/maps/address-location-picker";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import type { Doctor, DoctorInput } from "@/lib/queries/doctors";

// Espejo de UpdateDoctorDto (apps/api/src/doctors/dto/update-doctor.dto.ts)
const doctorSchema = z.object({
  firstName: z.string().min(1, "Requerido"),
  lastName: z.string().min(1, "Requerido"),
  phone: z.string(),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

function toCoord(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
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
  const [location, setLocation] = useState<AddressLocationValue>({
    address: defaultValues?.address ?? "",
    lat: toCoord(defaultValues?.lat),
    lng: toCoord(defaultValues?.lng),
    city: defaultValues?.city ?? "",
    department: defaultValues?.department ?? "",
    country: defaultValues?.country ?? "",
    zip: defaultValues?.zip ?? "",
  });

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
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
        address: location.address.trim() || undefined,
        city: location.city?.trim() || undefined,
        department: location.department?.trim() || undefined,
        country: location.country?.trim() || undefined,
        zip: location.zip?.trim() || undefined,
        ...(location.lat != null && location.lng != null
          ? { lat: location.lat, lng: location.lng }
          : {}),
      });
    } catch (err) {
      setError("root", {
        message:
          err instanceof ApiError
            ? err.message
            : "No se pudo guardar el doctor.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
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

      <AddressLocationPicker
        showAdminFields
        value={location}
        onChange={setLocation}
        mapClassName="h-64 w-full"
      />

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
