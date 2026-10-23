"use client";

import { useMemo, useState } from "react";
import type { TeamMemberPermission } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import { allTeamModuleKeys } from "@/lib/team-reference-permissions";
import { TeamMemberIdentityFields } from "./team-member-identity-fields";
import type { TeamMemberFormValues } from "./team-member-utils";
import { TeamPermissionModules } from "./team-permission-modules";

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

const EMPTY_FORM: TeamMemberFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  professionalKind: "",
  specialty: "",
  laborProfile: "",
};

function validateNewMember(form: TeamMemberFormValues): string | null {
  if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
    return "Completa nombre, apellidos y correo.";
  }
  if (form.password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!form.professionalKind) {
    return "Elige si el miembro es especialista médico o técnico laboral.";
  }
  if (form.professionalKind === "specialty" && !form.specialty.trim()) {
    return "Selecciona una especialidad médica.";
  }
  if (form.professionalKind === "labor" && !form.laborProfile.trim()) {
    return "Selecciona un perfil de técnico laboral.";
  }
  return null;
}

/**
 * Panel para invitar un miembro o cambiar sus permisos. Se abre como panel
 * lateral por encima de la página: antes era una columna fija junto al
 * listado y, en un portátil, dejaba la tabla de miembros en la mitad del
 * ancho con scroll horizontal. Se monta con `key` por miembro, así que su
 * estado inicial sale de las props y no hace falta sincronizarlo.
 */
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
    ...EMPTY_FORM,
    ...defaultValues,
  });
  const [modules, setModules] = useState<Set<TeamMemberPermission>>(
    () => new Set(defaultPermissions),
  );
  const [error, setError] = useState<string | null>(null);

  const allKeys = useMemo(() => allTeamModuleKeys(), []);
  const allSelected =
    allKeys.length > 0 && allKeys.every((key) => modules.has(key));
  // En edición se lee de las props: los perfiles de técnico laboral llegan
  // después y deciden si el miembro es técnico o especialista.
  const isLabor = defaultValues?.professionalKind === "labor";

  function toggleModule(key: TeamMemberPermission) {
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    const permissions = allKeys.filter((key) => modules.has(key));
    try {
      if (mode === "edit") {
        await onSaveEdit(permissions);
        return;
      }
      const invalid = validateNewMember(form);
      if (invalid) {
        setError(invalid);
        return;
      }
      await onSaveAdd(form, permissions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="top-0 right-0 left-auto flex h-dvh max-h-dvh w-full max-w-[min(100vw,480px)] translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-[480px]">
        <div className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle className="text-base font-semibold">
            Asignar permisos
          </DialogTitle>
          <DialogDescription className="mt-1">
            {mode === "edit" && memberName
              ? memberName
              : `Invita un miembro y define su acceso. Quedan ${seatsLeft} espacio${seatsLeft === 1 ? "" : "s"}.`}
          </DialogDescription>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {mode === "add" ? (
            <TeamMemberIdentityFields
              form={form}
              onChange={setForm}
              medicalSpecialties={medicalSpecialties}
              laborProfiles={laborProfiles}
            />
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <p className="font-medium text-foreground">
                {isLabor ? "Técnico laboral" : "Especialidad médica"}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {(isLabor ? defaultValues?.laborProfile : defaultValues?.specialty) ||
                  "—"}
              </p>
            </div>
          )}

          <TeamPermissionModules
            modules={modules}
            allSelected={allSelected}
            onToggle={toggleModule}
            onToggleAll={() =>
              setModules(allSelected ? new Set() : new Set(allKeys))
            }
          />

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
      </DialogContent>
    </Dialog>
  );
}
