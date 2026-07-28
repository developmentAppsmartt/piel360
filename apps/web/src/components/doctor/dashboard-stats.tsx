import Link from "next/link";

export function DashboardStats({
  patientCount,
  pendingCount,
}: {
  patientCount: number;
  pendingCount: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-muted-foreground">Pacientes</p>
        <p className="text-3xl font-semibold">{patientCount}</p>
        <Link href="/doctor/pacientes" className="text-xs text-primary hover:underline">
          Ver pacientes
        </Link>
      </div>

      <div className="space-y-1 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-muted-foreground">Pendientes de confirmar</p>
        <p
          className={`text-3xl font-semibold ${pendingCount > 0 ? "text-amber-600 dark:text-amber-500" : ""}`}
        >
          {pendingCount}
        </p>
        <p className="text-xs text-muted-foreground">Análisis esperando tu revisión</p>
      </div>
    </div>
  );
}
