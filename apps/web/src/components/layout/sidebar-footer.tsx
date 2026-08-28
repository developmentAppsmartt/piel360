"use client";

import { LogOut } from "lucide-react";
import Image from "next/image";
import { logoutAction } from "@/lib/actions/auth";
import { useMyDoctorProfile } from "@/lib/queries/doctors";
import { cn } from "@/lib/utils";

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function SidebarFooter({
  name,
  subtitle,
  avatarUrl,
  enrichFromDoctorProfile = false,
  monitorHint,
}: {
  name: string;
  subtitle: string;
  avatarUrl?: string | null;
  /** Carga nombre, especialidad y foto desde GET /doctors/me */
  enrichFromDoctorProfile?: boolean;
  /** Texto extra bajo el perfil (p. ej. moderador). */
  monitorHint?: string;
}) {
  const profile = useMyDoctorProfile(enrichFromDoctorProfile);

  const displayName = profile.data
    ? `Dr. ${profile.data.firstName} ${profile.data.lastName}`.trim()
    : name;
  const displaySubtitle = profile.data?.specialty?.trim() || subtitle;
  const photo = profile.data?.avatarUrl ?? avatarUrl ?? null;

  return (
    <div className="mt-auto shrink-0 border-t border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-zinc-200">
          {photo ? (
            <Image
              src={photo}
              alt=""
              fill
              className="object-cover"
              sizes="44px"
              unoptimized
            />
          ) : (
            <span className="flex size-full items-center justify-center text-sm font-semibold text-[#2B59C3]">
              {initialsFromName(displayName)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-[#1e3a6e]">
            {displayName}
          </p>
          <p className="truncate text-xs text-zinc-500">{displaySubtitle}</p>
          {monitorHint ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{monitorHint}</p>
          ) : null}
        </div>
      </div>

      <form action={logoutAction} className="border-t border-sidebar-border">
        <button
          type="submit"
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-zinc-600",
            "transition-colors hover:bg-sidebar-accent hover:text-zinc-900",
          )}
        >
          <LogOut className="size-5 shrink-0 text-zinc-500" strokeWidth={1.75} />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
