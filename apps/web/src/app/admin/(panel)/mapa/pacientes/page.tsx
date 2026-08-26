import { RegistryMapPanel } from "@/components/maps/registry-map-panel";

export default function AdminMapaPacientesPage() {
  return (
    <RegistryMapPanel
      title="Mapa de pacientes"
      description="Todos los pacientes con geolocalización."
      endpoint="/admin/map-markers"
      kind="patient"
    />
  );
}
