"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { TeamMemberPermission } from "@piel360/shared";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import {
  allTeamModuleKeys,
  TEAM_PERMISSION_GROUPS,
} from "@/lib/team-reference-permissions";

const inputClass =
  "h-10 w-full appearance-none rounded-xl border border-border bg-background px-3 pr-9 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

export type TeamMemberFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  professionalKind: "specialty" | "labor" | "";
  specialty: string;
  laborProfile: string;
};

type AssignPanelProps = {
  mode: "add" | "edit";
  memberName?: string;
  medicalSpecialties: string[];
  laborProfiles: string[];
  defaultPermissions: TeamMemberPermission[];
  defaultValues?: Partial<TeamMemberFormValues>;
  seatsLeft: number;
  saving?: boolean;
  onClose: () => void;
  onSaveAdd: (
    values: TeamMemberFormValues,
    permissions: TeamMemberPermission[],
  ) => Promise<void>;
  onSaveEdit: (permissions: TeamMemberPermission[]) => Promise<void>;
};

function SelectField({
  label,
  required,
  optional,
  value,
  disabled,
  onChange,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">
        {label}{" "}
        {required ? <span className="text-destructive">*</span> : null}
        {optional ? (
          <span className="font-normal text-muted-foreground">(Opcional)</span>
        ) : null}
      </span>
      <div className="relative">
        <select
          className={inputClass}
          value={value}
          disabled={disabled}
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

export function TeamMemberAssignPanel({
  mode,
  memberName,
  medicalSpecialties,
  laborProfiles,
  defaultPermissions,
  defaultValues,
  seatsLeft,
  saving,
  onClose,
  onSaveAdd,
  onSaveEdit,
}: AssignPanelProps) {
  const [form, setForm] = useState<TeamMemberFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    professionalKind: "",
    specialty: "",
    laborProfile: "",
    ...defaultValues,
  });
  const [modules, setModules] = useState<Set<TeamMemberPermission>>(
    () => new Set(defaultPermissions),
  );
  const [error, setError] = useState<string | null>(null);

  const allKeys = useMemo(() => allTeamModuleKeys(), []);
  const allSelected =
    allKeys.length > 0 && allKeys.every((key) => modules.has(key));

  useEffect(() => {
    setModules(new Set(defaultPermissions));
  }, [defaultPermissions]);

  useEffect(() => {
    if (defaultValues) {
      setForm((prev) => ({ ...prev, ...defaultValues }));
    }
  }, [defaultValues]);

  function toggleModule(key: TeamMemberPermission) {
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    setModules(allSelected ? new Set() : new Set(allKeys));
  }

  async function handleSave() {
    setError(null);
    const permissions = allKeys.filter((key) => modules.has(key));
    try {
      if (mode === "add") {
        if (
          !form.firstName.trim() ||
          !form.lastName.trim() ||
          !form.email.trim()
        ) {
          setError("Completa nombre, apellidos y correo.");
          return;
        }
        if (form.password.length < 8) {
          setError("La contraseña debe tener al menos 8 caracteres.");
          return;
        }
        if (!form.professionalKind) {
          setError(
            "Elige si el miembro es especialista médico o técnico laboral.",
          );
          return;
        }
        if (form.professionalKind === "specialty" && !form.specialty.trim()) {
          setError("Selecciona una especialidad médica.");
          return;
        }
        if (form.professionalKind === "labor" && !form.laborProfile.trim()) {
          setError("Selecciona un perfil de técnico laboral.");
          return;
        }
        await onSaveAdd(form, permissions);
      } else {
        await onSaveEdit(permissions);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.");
    }
  }

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-border bg-card shadow-lg lg:w-[420px] lg:max-h-[calc(100vh-10rem)] lg:sticky lg:top-6 lg:overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Asignar permisos
          </h3>
          {mode === "edit" && memberName ? (
            <p className="mt-1 text-sm text-muted-foreground">{memberName}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Invita un miembro y define su acceso. Quedan {seatsLeft} espacio
              {seatsLeft === 1 ? "" : "s"}.
            </p>
          )}
        </div>
        <button
          type="button"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onClose}
          aria-label="Cerrar panel"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {mode === "add" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Nombre</span>
              <input
                className={inputClass}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Apellidos</span>
              <input
                className={inputClass}
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium">Correo</span>
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium">Contraseña temporal</span>
              <input
                className={inputClass}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
          </div>
        ) : null}

        <div className="space-y-3">
          {mode === "edit" ? (
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <p className="font-medium text-foreground">
                {form.professionalKind === "labor"
                  ? "Técnico laboral"
                  : "Especialidad médica"}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {form.professionalKind === "labor"
                  ? form.laborProfile || "—"
                  : form.specialty || "—"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "specialty" as const, label: "Especialidad médica" },
                    { id: "labor" as const, label: "Técnico laboral" },
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
                      setForm({
                        ...form,
                        professionalKind: option.id,
                        specialty:
                          option.id === "specialty" ? form.specialty : "",
                        laborProfile:
                          option.id === "labor" ? form.laborProfile : "",
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
                  required
                  value={form.specialty}
                  onChange={(specialty) => setForm({ ...form, specialty })}
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
                  required
                  value={form.laborProfile}
                  onChange={(laborProfile) =>
                    setForm({ ...form, laborProfile })
                  }
                >
                  <option value="">Selecciona un técnico laboral</option>
                  {laborProfiles.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </SelectField>
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Activa o desactiva módulos. Puedes dejarlos todos vacíos. Solo
            afectan a este usuario.
          </p>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-sm text-indigo-900">
            <p className="font-medium">Análisis IA</p>
            <p className="mt-0.5 text-xs text-indigo-800/80">
              Dermatológico, Estético y Fototipo se asignan según la
              especialidad o el técnico laboral elegido (configuración del
              administrador en Permisos de planes). No se configuran aquí.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {TEAM_PERMISSION_GROUPS.map((group) => {
              const checked = modules.has(group.key);
              return (
                <label
                  key={group.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 shadow-sm transition-colors ${
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-background hover:border-primary/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-primary"
                    checked={checked}
                    onChange={() => toggleModule(group.key)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <group.icon className="size-4" aria-hidden />
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {group.label}
                      </span>
                    </span>
                    {group.description ? (
                      <span className="block text-xs text-muted-foreground">
                        {group.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            Seleccionar todos
          </label>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="flex gap-2 border-t border-border px-5 py-4">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={saving || (mode === "add" && seatsLeft < 1)}
          onClick={() => void handleSave()}
        >
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </aside>
  );
}

export function resolveMemberSpecialty(values: TeamMemberFormValues) {
  if (values.professionalKind === "labor") return values.laborProfile;
  if (values.professionalKind === "specialty") return values.specialty;
  return values.laborProfile || values.specialty;
}

export function inferMemberRoleLabel(
  specialty: string | null,
  laborProfileSet: Set<string>,
): string {
  if (specialty && laborProfileSet.has(specialty)) return "Técnico laboral";
  if (!specialty) return "Profesional";
  const lower = specialty.toLowerCase();
  if (lower.includes("dermatolog")) return "Dermatólogo";
  if (lower.includes("estétic") || lower.includes("estetic")) {
    return "Médico estético";
  }
  if (lower.includes("cosmet")) return "Esteticista";
  return "Profesional";
}
