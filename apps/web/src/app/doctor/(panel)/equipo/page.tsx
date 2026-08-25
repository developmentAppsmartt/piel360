import { redirect } from "next/navigation";

/** Ruta legacy: el módulo Equipo vive en Configuración. */
export default function EquipoRedirectPage() {
  redirect("/doctor/configuracion/equipos");
}
