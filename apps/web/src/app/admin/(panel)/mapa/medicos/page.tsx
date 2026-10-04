import { RegistryMapPanel } from "@/components/maps/registry-map-panel";

export default function AdminMapaMedicosPage() {
  return (
    <RegistryMapPanel
      title="Mapa de Profesionales"
      description="Todos los profesionales registrados con geolocalización."
      endpoint="/admin/map-markers"
      kind="doctor"
    />
  );
}
