import { RegistryMapPanel } from "@/components/maps/registry-map-panel";

export default function DoctorMapasPacientesPage() {
  return (
    <RegistryMapPanel
      title="Mapa de pacientes"
      description="Pacientes de tu consulta con ubicación registrada."
      endpoint="/organizations/me/map-markers"
      kind="patient"
    />
  );
}
