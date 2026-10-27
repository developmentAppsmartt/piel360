import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { reglaMaxLineas } from "../../packages/config/eslint.max-lines.mjs";

/** Deuda del día que entró `max-lines`: esta lista solo puede encoger. */
const ARCHIVOS_LARGOS_HEREDADOS = [
  "src/app/admin/(panel)/configuracion/empresas-aliadas/page.tsx",
  "src/app/doctor/(panel)/configuracion/company-profile-section.tsx",
  "src/app/doctor/(panel)/configuracion/doctor-profile-form.tsx",
  "src/app/doctor/(panel)/configuracion/personalizacion/identidad-corporativa/identidad-corporativa-view.tsx",
  "src/app/doctor/(panel)/configuracion/personalizacion/rangos-puntuacion/rangos-puntuacion-view.tsx",
  "src/components/admin/labor-technician-profiles-manager.tsx",
  "src/components/admin/plan-wizard-form.tsx",
  "src/components/admin/plans-manager.tsx",
  "src/components/admin/role-editor-form.tsx",
  "src/components/admin/role-permissions-matrix.tsx",
  "src/components/admin/subscriptions-manager.tsx",
  "src/components/admin/verification-dashboard.tsx",
  "src/components/agenda/agenda-workspace.tsx",
  "src/components/agenda/patient-agenda-workspace.tsx",
  "src/components/analyses/analysis-consumption-view.tsx",
  "src/components/analyses/youcam-report-view.tsx",
  "src/components/auth/doctor-register-form.tsx",
  "src/components/auth/empresa-register-form.tsx",
  "src/components/doctor/doctor-billing-hub.tsx",
  "src/components/layout/sidebar-nav.tsx",
  "src/components/maps/address-location-picker.tsx",
  "src/components/patients/patient-comparison-view.tsx",
  "src/components/patients/patient-form.tsx",
  "src/lib/mocks/admin-bolsa.ts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...reglaMaxLineas(ARCHIVOS_LARGOS_HEREDADOS),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
