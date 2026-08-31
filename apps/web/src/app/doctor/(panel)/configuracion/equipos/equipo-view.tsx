"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_TEAM_MEMBER_PERMISSIONS,
  type TeamMemberPermission,
} from "@piel360/shared";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Pencil,
  Plus,
  Settings2,
  Stethoscope,
  Trash2,
  UserCog,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClientFetch } from "@/lib/api-client";
import { useSpecialties } from "@/lib/queries/specialties";
import { useLaborTechnicianProfiles } from "@/lib/queries/labor-technician-profiles";
import { cn } from "@/lib/utils";
import {
  inferMemberRoleLabel,
  resolveMemberSpecialty,
  TeamMemberAssignPanel,
  type TeamMemberFormValues,
} from "./team-member-assign-panel";

type OrgMember = {
  id: string;
  memberRole: string;
  userId: string;
  email: string;
  name: string;
  specialty: string | null;
  city: string | null;
  verificationStatus: string | null;
  lastAccessAt: string | null;
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

type TeamTab = "specialists" | "labor";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function formatLastAccess(iso: string | null, withTime = false) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  if (withTime) {
    return `Último ingreso el ${date.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })} a las ${date.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}`;
  }
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function memberIsActive(status: string | null) {
  if (!status) return true;
  return ["active", "approved", "verified"].includes(status);
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MemberAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initialsFromName(name)}
    </span>
  );
}

function MemberStatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Activo
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
      Inactivo
    </span>
  );
}

function buildEditDefaults(
  member: OrgMember,
  laborProfileSet: Set<string>,
): Partial<TeamMemberFormValues> {
  const isLabor = Boolean(member.specialty && laborProfileSet.has(member.specialty));
  return {
    professionalKind: isLabor ? "labor" : "specialty",
    specialty: isLabor ? "" : (member.specialty ?? ""),
    laborProfile: isLabor ? (member.specialty ?? "") : "",
  };
}

export function DoctorEquipoView() {
  const qc = useQueryClient();
  const specialtiesQuery = useSpecialties();
  const laborQuery = useLaborTechnicianProfiles();
  const medicalSpecialties = specialtiesQuery.data?.map((s) => s.name) ?? [];
  const laborProfiles = laborQuery.data?.map((p) => p.name) ?? [];

  const query = useQuery({
    queryKey: ["organizations", "me"],
    queryFn: () => apiClientFetch<OrgMine>("/organizations/me"),
    retry: false,
  });

  const [tab, setTab] = useState<TeamTab>("specialists");
  const [panel, setPanel] = useState<"closed" | "add" | "edit">("closed");
  const [editingMember, setEditingMember] = useState<OrgMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const addMutation = useMutation({
    mutationFn: (input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone: string;
      specialty?: string;
      permissions?: TeamMemberPermission[];
    }) =>
      apiClientFetch<OrgMember>("/organizations/me/members", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["organizations", "me"] });
      setPanel("closed");
    },
  });

  const permsMutation = useMutation({
    mutationFn: ({
      memberId,
      permissions,
    }: {
      memberId: string;
      permissions: TeamMemberPermission[];
    }) =>
      apiClientFetch(`/organizations/me/members/${memberId}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["organizations", "me"] });
      setPanel("closed");
      setEditingMember(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiClientFetch(`/organizations/me/members/${memberId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["organizations", "me"] });
    },
  });

  const laborProfileSet = useMemo(() => new Set(laborProfiles), [laborProfiles]);

  const filteredMembers = useMemo(() => {
    const members = query.data?.members ?? [];
    const nonOwners = members.filter((m) => m.memberRole !== "owner");
    if (tab === "labor") {
      return nonOwners.filter((m) => m.specialty && laborProfileSet.has(m.specialty));
    }
    return nonOwners.filter(
      (m) => !m.specialty || !laborProfileSet.has(m.specialty),
    );
  }, [query.data?.members, tab, laborProfileSet]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  const rangeStart = filteredMembers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredMembers.length);

  const owner = query.data?.members.find((m) => m.memberRole === "owner");

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando equipo…</p>;
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">Equipo</h2>
        <p className="text-sm text-muted-foreground">
          No encontramos una organización asociada a tu cuenta. Si te registraste
          como empresa o empresa aliada, recarga o contacta soporte.
        </p>
        <Link href="/doctor/configuracion" className="text-sm text-primary underline">
          Volver a configuración
        </Link>
      </div>
    );
  }

  const org = query.data;
  const isOwner = org.memberRole === "owner";
  const seatsLeft = Math.max(0, org.seatLimit - org.seatUsed);
  const pending = org.status === "pending";

  async function handleSaveAdd(
    values: TeamMemberFormValues,
    permissions: TeamMemberPermission[],
  ) {
    setSaving(true);
    try {
      await addMutation.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: values.phone,
        specialty: resolveMemberSpecialty(values),
        permissions,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(permissions: TeamMemberPermission[]) {
    if (!editingMember) return;
    setSaving(true);
    try {
      await permsMutation.mutateAsync({
        memberId: editingMember.id,
        permissions,
      });
    } finally {
      setSaving(false);
    }
  }

  function openAddPanel() {
    setEditingMember(null);
    setPanel("add");
  }

  function openEditPanel(member: OrgMember) {
    setEditingMember(member);
    setPanel("edit");
  }

  function closePanel() {
    setPanel("closed");
    setEditingMember(null);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        panel !== "closed" && isOwner ? "xl:flex-row xl:items-start" : "",
      )}
    >
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Equipo</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Gestiona los miembros de tu organización, sus roles y permisos dentro
              de Piel 360.
            </p>
            {pending ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Tu membresía está pendiente de activación.
              </p>
            ) : null}
          </div>
          {isOwner ? (
            <Button type="button" disabled={seatsLeft < 1} onClick={openAddPanel}>
              <UserPlus className="size-4" />
              Invitar miembro
            </Button>
          ) : null}
        </div>

        <div className="flex gap-6 border-b border-border">
          {(
            [
              { id: "specialists" as const, label: "Especialistas", icon: Stethoscope },
              { id: "labor" as const, label: "Técnicos laborales", icon: UserCog },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors",
                tab === item.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setTab(item.id);
                setPage(1);
              }}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </button>
          ))}
        </div>

        {owner ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Propietario de la cuenta</p>
            <p className="mt-1 text-sm text-muted-foreground">
              El propietario de la cuenta tiene permiso para acceder a todas las páginas.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MemberAvatar name={owner.name} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{owner.name}</p>
                    <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      Propietario
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{owner.email}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatLastAccess(owner.lastAccessAt, true)}
                  </p>
                </div>
              </div>
              {isOwner ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  title="Próximamente"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Crown className="size-4" />
                  Transferir permiso de propietario
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">Miembros del equipo</h3>
            {isOwner ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={seatsLeft < 1}
                  onClick={openAddPanel}
                >
                  <Plus className="size-4" />
                  Añadir miembro
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  title="Próximamente"
                >
                  <Settings2 className="size-4" />
                  Administración de roles
                </Button>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 text-left text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nombre</th>
                    <th className="px-4 py-3 font-semibold">Rol</th>
                    <th className="px-4 py-3 font-semibold">Especialidad / Área</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Último acceso</th>
                    {isOwner ? (
                      <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isOwner ? 6 : 5}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No hay miembros en esta categoría.
                      </td>
                    </tr>
                  ) : (
                    paginatedMembers.map((member) => {
                      const roleLabel = inferMemberRoleLabel(
                        member.specialty,
                        laborProfileSet,
                      );
                      return (
                        <tr
                          key={member.id}
                          className={cn(
                            "border-t border-border/80 transition-colors",
                            editingMember?.id === member.id && "bg-primary/5",
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <MemberAvatar name={member.name} />
                              <div>
                                <p className="font-medium text-foreground">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-primary">{roleLabel}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {member.specialty ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <MemberStatusBadge
                              active={memberIsActive(member.verificationStatus)}
                            />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatLastAccess(member.lastAccessAt)}
                          </td>
                          {isOwner ? (
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                                  onClick={() => openEditPanel(member)}
                                  aria-label={`Editar ${member.name}`}
                                >
                                  <Pencil className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50"
                                  disabled={removeMutation.isPending}
                                  onClick={() => {
                                    if (
                                      !confirm(
                                        `¿Eliminar a ${member.name} del equipo? Se borrará su cuenta.`,
                                      )
                                    ) {
                                      return;
                                    }
                                    removeMutation.mutate(member.id);
                                  }}
                                  aria-label={`Eliminar ${member.name}`}
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredMembers.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
                <p>
                  Mostrando {rangeStart} a {rangeEnd} de {filteredMembers.length} registros
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span className="text-xs">Mostrar</span>
                    <select
                      className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                        setPage(1);
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs">registros</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                      {currentPage}
                    </span>
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Página siguiente"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            {org.name} · plan {org.seatPlan} ({org.seatUsed}/{org.seatLimit} espacios)
          </p>
        </div>
      </div>

      {panel !== "closed" && isOwner ? (
        <TeamMemberAssignPanel
          key={editingMember?.id ?? "add"}
          mode={panel === "add" ? "add" : "edit"}
          memberName={editingMember?.name}
          medicalSpecialties={medicalSpecialties}
          laborProfiles={laborProfiles}
          defaultPermissions={
            editingMember?.permissions?.length
              ? editingMember.permissions
              : [...DEFAULT_TEAM_MEMBER_PERMISSIONS]
          }
          defaultValues={
            editingMember
              ? buildEditDefaults(editingMember, laborProfileSet)
              : undefined
          }
          seatsLeft={seatsLeft}
          saving={saving || addMutation.isPending || permsMutation.isPending}
          onClose={closePanel}
          onSaveAdd={handleSaveAdd}
          onSaveEdit={handleSaveEdit}
        />
      ) : null}
    </div>
  );
}
