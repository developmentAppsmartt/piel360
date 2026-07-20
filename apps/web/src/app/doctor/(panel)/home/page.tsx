import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function DoctorHomePage() {
  const session = await getSession();
  // Defensa extra — src/proxy.ts ya protege esta ruta antes de llegar aquí.
  if (!session) redirect("/doctor/login");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Panel del doctor</h1>
      <p className="text-muted-foreground">Sesión activa: {session.email}</p>
    </div>
  );
}
