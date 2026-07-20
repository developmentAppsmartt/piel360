import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function AdminDashboardPage() {
  const session = await getSession();
  // Defensa extra — src/proxy.ts ya protege esta ruta antes de llegar aquí.
  if (!session) redirect("/admin/login");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Panel de administración</h1>
      <p className="text-muted-foreground">Sesión activa: {session.email}</p>
    </div>
  );
}
