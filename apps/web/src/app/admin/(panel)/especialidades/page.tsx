"use client";

import Link from "next/link";
import {
  SpecialtiesAdminPanel,
} from "@/components/admin/specialties-manager";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";

export default function EspecialidadesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/admin/roles" className="hover:text-foreground">
            Roles y permisos
          </Link>{" "}
          › <span className="text-foreground">Especialidades</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Especialidades médicas
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Administra las especialidades disponibles en el registro de doctores.
          Cada especialidad crea un rol RBAC asociado que controla los permisos
          de análisis en la matriz de planes.
        </p>
      </div>

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">Catálogo</ModuleCardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Las especialidades activas aparecen en el registro y en la matriz de
          permisos de planes.
        </p>
        <div className="mt-4">
          <SpecialtiesAdminPanel />
        </div>
      </ModuleCard>
    </div>
  );
}
