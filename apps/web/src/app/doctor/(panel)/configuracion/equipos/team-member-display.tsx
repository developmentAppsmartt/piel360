"use client";

import { Crown } from "lucide-react";
import type { TeamMemberPermission } from "@piel360/shared";
import { Button } from "@/components/ui/button";

export type OrgMember = {
  id: string;
  memberRole: string;
  userId: string;
  email: string;
  name: string;
  specialty: string | null;
  professionalKind: string | null;
  city: string | null;
  verificationStatus: string | null;
  lastAccessAt: string | null;
  permissions: TeamMemberPermission[];
};

export function formatLastAccess(iso: string | null, withTime = false) {
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

export function MemberAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initialsFromName(name)}
    </span>
  );
}

export function MemberStatusBadge({ status }: { status: string | null }) {
  if (memberIsActive(status)) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Activo
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
        Rechazado
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      En moderación
    </span>
  );
}

export function OwnerCard({
  owner,
  isOwner,
}: {
  owner: OrgMember;
  isOwner: boolean;
}) {
  return (
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
  );
}
