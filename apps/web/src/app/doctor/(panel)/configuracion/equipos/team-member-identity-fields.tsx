"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { TeamMemberFormValues } from "./team-member-utils";

const inputClass =
  "h-10 w-full appearance-none rounded-xl border border-border bg-background px-3 pr-9 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">
        {label} <span className="text-destructive">*</span>
      </span>
      <div className="relative">
        <select
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
    </label>
  );
}

function TextField({
  label,
  type = "text",
  value,
  wide,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  wide?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="font-medium">{label}</span>
      <input
        className={inputClass}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Datos de un miembro nuevo: identidad, acceso y si es especialista o
 * técnico laboral. */
export function TeamMemberIdentityFields({
  form,
  onChange,
  medicalSpecialties,
  laborProfiles,
}: {
  form: TeamMemberFormValues;
  onChange: (next: TeamMemberFormValues) => void;
  medicalSpecialties: string[];
  laborProfiles: string[];
}) {
  const set = (patch: Partial<TeamMemberFormValues>) =>
    onChange({ ...form, ...patch });

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Nombre" value={form.firstName} onChange={(firstName) => set({ firstName })} />
        <TextField label="Apellidos" value={form.lastName} onChange={(lastName) => set({ lastName })} />
        <TextField label="Correo" type="email" wide value={form.email} onChange={(email) => set({ email })} />
        <TextField
          label="Contraseña temporal"
          type="password"
          wide
          value={form.password}
          onChange={(password) => set({ password })}
        />
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "specialty", label: "Especialidad médica" },
              { id: "labor", label: "Técnico laboral" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                form.professionalKind === option.id
                  ? "border-primary bg-primary/5 font-medium text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/40"
              }`}
              onClick={() =>
                set({
                  professionalKind: option.id,
                  specialty: option.id === "specialty" ? form.specialty : "",
                  laborProfile: option.id === "labor" ? form.laborProfile : "",
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        {form.professionalKind === "specialty" ? (
          <SelectField
            label="Especialidad"
            value={form.specialty}
            onChange={(specialty) => set({ specialty })}
          >
            <option value="">Selecciona una especialidad</option>
            {medicalSpecialties.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectField>
        ) : null}

        {form.professionalKind === "labor" ? (
          <SelectField
            label="Técnico laboral"
            value={form.laborProfile}
            onChange={(laborProfile) => set({ laborProfile })}
          >
            <option value="">Selecciona un técnico laboral</option>
            {laborProfiles.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>
    </>
  );
}
