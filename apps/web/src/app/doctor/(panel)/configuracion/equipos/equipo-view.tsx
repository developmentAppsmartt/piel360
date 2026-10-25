"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Settings2, Stethoscope, UserCog, UserPlus } from "lucide-react";
import type { TeamMemberPermission } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import { apiClientFetch } from "@/lib/api-client";
import { useSpecialties } from "@/lib/queries/specialties";
import { useLaborTechnicianProfiles } from "@/lib/queries/labor-technician-profiles";
import { cn } from "@/lib/utils";
import { TeamMemberAssignPanel } from "./team-member-assign-panel";
import { OwnerCard, type OrgMember } from "./team-member-display";
import { TeamMembersTable } from "./team-members-table";
import {
  resolveMemberSpecialty,
  type TeamMemberFormValues,
} from "./team-member-utils";

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

function buildEditDefaults(
  member: OrgMember,
  laborProfileSet: Set<string>,
): Partial<TeamMemberFormValues> {
  // `professionalKind` es el dato real; la heuristica sobre el catalogo solo
  // cubre a los miembros creados antes de que se empezara a guardar.
  const isLabor =
    member.professionalKind === "labor" ||
    (member.professionalKind == null &&
      Boolean(member.specialty && laborProfileSet.has(member.specialty)));
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
  const medicalSpecialties = useMemo(
    () => specialtiesQuery.data?.map((s) => s.name) ?? [],
    [specialtiesQuery.data],
  );
  const laborProfiles = useMemo(
    () => laborQuery.data?.map((p) => p.name) ?? [],
    [laborQuery.data],
  );

  const query = useQuery({
    queryKey: ["organizations", "me"],
    queryFn: () => apiClientFetch<OrgMine>("/organizations/me"),
    retry: false,
  });

  const [tab, setTab] = useState<TeamTab>("specialists");
  const [panel, setPanel] = useState<"closed" | "add" | "edit">("closed");
  const [editingMember, setEditingMember] = useState<OrgMember | null>(null);
  const [saving, setSaving] = useState(false);

  // `invitationEmailSent` llega en false cuando el correo con la clave
  // temporal no salió (ver OrganizationsService.addDoctor): el miembro existe
  // igual, pero el dueño tiene que pasarle los datos a mano.
  const [inviteWarning, setInviteWarning] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: (input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      specialty?: string;
      professionalKind?: "specialty" | "labor";
      permissions?: TeamMemberPermission[];
    }) =>
      apiClientFetch<OrgMember & { invitationEmailSent?: boolean }>(
        "/organizations/me/members",
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ["organizations", "me"] });
      setPanel("closed");
      setInviteWarning(
        created.invitationEmailSent === false
          ? `${created.email} quedó creado, pero no se pudo enviar el correo de invitación. Pásale tú la clave temporal que acabas de definir y el enlace para entrar.`
          : null,
      );
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
        specialty: resolveMemberSpecialty(values),
        // Sin esto el miembro nacia sin tipo y el panel de verificacion le
        // exigia los documentos de medico aunque fuera tecnico laboral.
        professionalKind: values.professionalKind || undefined,
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
    setInviteWarning(null);
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

  function removeMember(member: OrgMember) {
    if (!confirm(`¿Eliminar a ${member.name} del equipo? Se borrará su cuenta.`)) {
      return;
    }
    removeMutation.mutate(member.id);
  }

  return (
    <div className="space-y-6">
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
          {inviteWarning ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {inviteWarning}
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
            onClick={() => setTab(item.id)}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </button>
        ))}
      </div>

      {owner ? <OwnerCard owner={owner} isOwner={isOwner} /> : null}

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

        {/* `key` por pestaña: al cambiarla la paginación vuelve a la 1. */}
        <TeamMembersTable
          key={tab}
          members={filteredMembers}
          isOwner={isOwner}
          laborProfileSet={laborProfileSet}
          editingId={editingMember?.id ?? null}
          removing={removeMutation.isPending}
          onEdit={openEditPanel}
          onRemove={removeMember}
        />

        <p className="text-xs text-muted-foreground">
          {org.name} · plan {org.seatPlan} ({org.seatUsed}/{org.seatLimit} espacios)
        </p>
      </div>

      {panel !== "closed" && isOwner ? (
        <TeamMemberAssignPanel
          key={editingMember?.id ?? "add"}
          mode={panel === "add" ? "add" : "edit"}
          memberName={editingMember?.name}
          medicalSpecialties={medicalSpecialties}
          laborProfiles={laborProfiles}
          defaultPermissions={
            editingMember ? (editingMember.permissions ?? []) : []
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
