import { RegistryMapPanel } from "@/components/maps/registry-map-panel";

export default function AdminMapaMedicosPage() {
  return (
    <RegistryMapPanel
      title="Mapa de médicos"
      description="Todos los doctores registrados con geolocalización."
      endpoint="/admin/map-markers"
      kind="doctor"
    />
  );
}
