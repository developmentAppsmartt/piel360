"use client";

import Link from "next/link";
import { SpecialtyPlanPermissionsMatrix } from "@/components/admin/specialty-plan-permissions-matrix";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";

export default function PermisosPlanesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/admin/roles" className="hover:text-foreground">
            Roles y permisos
          </Link>{" "}
          › <span className="text-foreground">Permisos de planes</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Permisos de planes por profesional
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Define qué tipos de análisis y planes puede usar cada especialidad médica y cada
          perfil de técnico laboral. Los usuarios solo verán y podrán ejecutar los servicios
          habilitados para su rol profesional.
        </p>
      </div>

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">
          Matriz profesional × servicio
        </ModuleCardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Dermatológico (Skiniver), Estético (YouCam) y Fototipo (Fitzpatrick).
          Las filas se cargan desde{" "}
          <Link href="/admin/especialidades" className="underline hover:text-foreground">
            Profesionales › Especialidades
          </Link>{" "}
          y{" "}
          <Link href="/admin/tecnico-laboral" className="underline hover:text-foreground">
            Profesionales › Técnico laboral
          </Link>
          .
        </p>
        <div className="mt-4">
          <SpecialtyPlanPermissionsMatrix />
        </div>
      </ModuleCard>
    </div>
  );
}
