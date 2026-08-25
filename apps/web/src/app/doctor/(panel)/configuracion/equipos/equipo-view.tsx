"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_TEAM_MEMBER_PERMISSIONS,
  TEAM_MEMBER_PERMISSION_LABELS,
  TEAM_MEMBER_PERMISSIONS,
  type TeamMemberPermission,
} from "@piel360/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import { apiClientFetch } from "@/lib/api-client";
import { SpecialtySelect } from "@/components/specialties/specialty-select";

type OrgMember = {
  id: string;
  memberRole: string;
  userId: string;
  email: string;
  name: string;
  specialty: string | null;
  city: string | null;
  permissions: TeamMemberPermission[];
};

type OrgMine = {
  id: string;
  type: string;
  name: string;
  seatPlan: string;
  seatLimit: number;
  seatUsed: number;
  status: string;
  memberRole: string;
  members: OrgMember[];
};

type AddDoctorInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  specialty?: string;
  permissions?: TeamMemberPermission[];
};

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500";

function AddDoctorDialog({
  open,
  onOpenChange,
  seatsLeft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seatsLeft: number;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    specialty: string;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    specialty: "",
  });

  const mutation = useMutation({
    mutationFn: (input: AddDoctorInput) =>
      apiClientFetch<OrgMember>("/organizations/me/members", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["organizations", "me"] });
      onOpenChange(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        specialty: "",
      });
      setError(null);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? Array.isArray(err.message)
            ? err.message.join(", ")
            : err.message
          : "No se pudo añadir el doctor.",
      );
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const phone = form.phone.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(phone)) {
      setError("Celular inválido (10–15 dígitos con indicativo).");
      return;
    }
    mutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      phone,
      specialty: form.specialty,
      permissions: [...DEFAULT_TEAM_MEMBER_PERMISSIONS],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Añadir doctor al equipo</DialogTitle>
          <DialogDescription>
            Completa el registro. Quedarán {seatsLeft} espacio
            {seatsLeft === 1 ? "" : "s"} después de añadirlo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nombre</span>
            <input
              className={inputClass}
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Apellidos</span>
            <input
              className={inputClass}
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Correo</span>
            <input
              className={inputClass}
              type="email"
              required
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Celular</span>
            <input
              className={inputClass}
              type="tel"
              required
              placeholder="573001112233"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Especialidad</span>
            <SpecialtySelect
              className={inputClass}
              value={form.specialty}
              onChange={(specialty) => setForm({ ...form, specialty })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Contraseña temporal</span>
            <input
              className={inputClass}
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          {error ? (
            <p className="text-sm text-destructive sm:col-span-2">{error}</p>
          ) : null}
          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || seatsLeft < 1}>
              {mutation.isPending ? "Creando…" : "Añadir doctor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialog({
  member,
  open,
  onOpenChange,
}: {
  member: OrgMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<TeamMemberPermission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !member) return;
    setSelected(
      member.permissions?.length
        ? [...member.permissions]
        : [...DEFAULT_TEAM_MEMBER_PERMISSIONS],
    );
    setError(null);
  }, [open, member]);

  const mutation = useMutation({
    mutationFn: (permissions: TeamMemberPermission[]) =>
      apiClientFetch(`/organizations/me/members/${member!.id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["organizations", "me"] });
      onOpenChange(false);
      setError(null);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.message : "No se pudieron guardar.",
      );
    },
  });

  function toggle(perm: TeamMemberPermission) {
    setSelected((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Permisos del equipo</DialogTitle>
          <DialogDescription>
            {member
              ? `Módulos que puede usar ${member.name} (${member.email}).`
              : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {TEAM_MEMBER_PERMISSIONS.map((perm) => (
            <label
              key={perm}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(perm)}
                onChange={() => toggle(perm)}
                className="size-4"
              />
              {TEAM_MEMBER_PERMISSION_LABELS[perm]}
            </label>
          ))}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || !member}
            onClick={() => mutation.mutate(selected)}
          >
            {mutation.isPending ? "Guardando…" : "Guardar permisos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DoctorEquipoView() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["organizations", "me"],
    queryFn: () => apiClientFetch<OrgMine>("/organizations/me"),
    retry: false,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [permsMember, setPermsMember] = useState<OrgMember | null>(null);

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiClientFetch(`/organizations/me/members/${memberId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["organizations", "me"] });
    },
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando equipo…</p>;
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Equipo</h1>
        <p className="text-sm text-muted-foreground">
          No encontramos una organización asociada a tu cuenta. Si acabas de
          registrarte como empresa, recarga o contacta soporte.
        </p>
        <Link
          href="/doctor/configuracion"
          className="text-sm text-sky-600 underline"
        >
          Volver a configuración
        </Link>
      </div>
    );
  }

  const org = query.data;
  const isOwner = org.memberRole === "owner";
  const seatsLeft = Math.max(0, org.seatLimit - org.seatUsed);
  const pending = org.status === "pending";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Equipo</h1>
          <p className="text-sm text-muted-foreground">
            Miembros de {org.name} · plan {org.seatPlan} ({org.seatUsed}/
            {org.seatLimit} espacios)
          </p>
          {pending ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Tu membresía empresa está pendiente de activación. Puedes gestionar
              el equipo; algunas funciones pueden limitarse hasta activarse.
            </p>
          ) : null}
        </div>
        {isOwner ? (
          <Button
            type="button"
            disabled={seatsLeft < 1}
            onClick={() => setAddOpen(true)}
          >
            Añadir doctor
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Especialidad</th>
              {isOwner ? (
                <th className="px-4 py-3 font-medium">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {org.members.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3">{m.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-3 capitalize">{m.memberRole}</td>
                <td className="px-4 py-3">{m.specialty ?? "—"}</td>
                {isOwner ? (
                  <td className="px-4 py-3">
                    {m.memberRole === "member" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPermsMember(m)}
                        >
                          Permisos
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={removeMutation.isPending}
                          onClick={() => {
                            if (
                              !confirm(
                                `¿Eliminar a ${m.name} (${m.email}) del equipo? Se borrará su cuenta.`,
                              )
                            ) {
                              return;
                            }
                            removeMutation.mutate(m.id);
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddDoctorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        seatsLeft={seatsLeft}
      />
      <PermissionsDialog
        member={permsMember}
        open={!!permsMember}
        onOpenChange={(open) => {
          if (!open) setPermsMember(null);
        }}
      />
    </div>
  );
}
