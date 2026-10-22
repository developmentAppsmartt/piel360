import { redirect } from "next/navigation";

/** Ruta legacy: redirige al alias público sin exponer el vendor. */
export default async function NuevoAnalisisAnalisisPiel360Redirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/doctor/pacientes/${id}/nuevo-analisis-analisispiel360`);
}
