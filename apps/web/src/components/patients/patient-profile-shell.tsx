import { ModuleCard } from "@/components/ui/module-card";
import type { Patient } from "@/lib/queries/patients";
import type { PatientsPanel } from "@/lib/patients-panel";
import { PatientDetailTabs } from "./patient-detail-tabs";
import { ProfileDetailsGrid, ProfileStatChips } from "./profile/profile-details";
import { ProfileHero } from "./profile/profile-hero";

/** Ficha del paciente (doctor y admin): cabecera, datos de un vistazo,
 * pestañas y todos los datos del paciente. */
export function PatientProfileShell({
  patient,
  children,
  panel = "doctor",
  showNewAnalysis = true,
  analysisFilter,
}: {
  patient: Patient;
  children: React.ReactNode;
  panel?: PatientsPanel;
  showNewAnalysis?: boolean;
  /** Filtro por tipo del historial; solo en la pestaña Resumen. */
  analysisFilter?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <ModuleCard className="space-y-5 p-5">
        <ProfileHero patient={patient} panel={panel} showNewAnalysis={showNewAnalysis} />
        <ProfileStatChips patient={patient} />
        <PatientDetailTabs patientId={patient.id} panel={panel} />
        <ProfileDetailsGrid patient={patient} />
        {analysisFilter ? <div>{analysisFilter}</div> : null}
      </ModuleCard>

      {children}
    </div>
  );
}
