import { RegistryMapPanel } from "@/components/maps/registry-map-panel";

export default function DoctorMapasMedicosPage() {
  return (
    <RegistryMapPanel
      title="Mapa de médicos"
      description="Ubicación de tu consulta y del equipo (si tienes membresía empresa)."
      endpoint="/organizations/me/map-markers"
      kind="doctor"
    />
  );
}
