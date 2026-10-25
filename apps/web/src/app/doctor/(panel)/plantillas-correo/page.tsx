"use client";

import {
  DOCTOR_EVENT_KIND_IDS,
  EmailTemplatesWorkspace,
} from "@/components/email-templates/email-templates-workspace";
import { isEnterpriseDoctor, useMyDoctorProfile } from "@/lib/queries/doctors";

/** La invitación al equipo solo le sirve a quien administra un equipo: las
 * empresas (membresía y aliadas). Es el mismo criterio que muestra la
 * pestaña «Equipo» en Configuración. Mientras carga el perfil se esconde —
 * mejor que aparezca un instante tarde a que parpadee una que no toca. */
export default function DoctorEmailTemplatesPage() {
  const profile = useMyDoctorProfile();
  const esEmpresa = profile.data ? isEnterpriseDoctor(profile.data) : false;

  const eventKinds = esEmpresa
    ? DOCTOR_EVENT_KIND_IDS
    : DOCTOR_EVENT_KIND_IDS.filter((kind) => kind !== "team_member_invitation");

  return <EmailTemplatesWorkspace eventKinds={eventKinds} />;
}
