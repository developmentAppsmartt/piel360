import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { ModuleCard, ModuleCardDescription, ModuleCardTitle } from "@/components/ui/module-card";
import { SkinAgeRulesConfigurator } from "@/components/skin-age-rules/skin-age-rules-configurator";
import { fetchUserPermissionsFromCookies } from "@/lib/server-auth-permissions";
import { getSession } from "@/lib/session";

/**
 * En admin el módulo aparece en Roles y permisos (panel admin).
 * Si el usuario también tiene el permiso clínico, puede configurar reglas aquí.
 */
export default async function AdminSkinAgeRulesPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const freshPermissions = await fetchUserPermissionsFromCookies();
  const permissions = freshPermissions ?? session.permissions ?? [];
  const canConfigureClinically =
    permissions.includes("clinical.skin_age_rules") ||
    permissions.includes("clinical.routines");

  if (canConfigureClinically) {
    return <SkinAgeRulesConfigurator />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reglas por edad de piel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Módulo de parametrización clínica: diferencia entre edad de piel (IA) y edad
          cronológica del paciente.
        </p>
      </div>

      <ModuleCard className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <ModuleCardTitle>Cómo habilitarlo</ModuleCardTitle>
            <ModuleCardDescription className="mt-2 text-sm leading-relaxed">
              Asigna el permiso <strong>Reglas por edad de piel</strong> en Roles y permisos:
            </ModuleCardDescription>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                En <strong>Módulos del panel clínico</strong> → para profesionales y
                empresas.
              </li>
              <li>
                En <strong>Módulos del panel admin</strong> → para roles de administración
                que deban ver este módulo.
              </li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              La configuración de reglas (productos, rutinas, tratamientos y suplementos)
              se realiza en el panel clínico de cada profesional o empresa.
            </p>
          </div>
        </div>
        <Link
          href="/admin/roles"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          Ir a Roles y permisos
          <ArrowRight className="size-4" />
        </Link>
      </ModuleCard>
    </div>
  );
}
