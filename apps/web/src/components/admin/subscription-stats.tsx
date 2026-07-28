import type { AdminDashboardStats } from "@/lib/queries/admin-dashboard";

const STATS: {
  key: keyof AdminDashboardStats["subscriptions"];
  label: string;
  description: string;
  colorClass: string;
}[] = [
  {
    key: "active",
    label: "Suscripciones activas",
    description: "Suscripciones en uso actual",
    colorClass: "text-green-600 dark:text-green-500",
  },
  {
    key: "pending",
    label: "Pendientes",
    description: "Esperando confirmación de pago",
    colorClass: "text-amber-600 dark:text-amber-500",
  },
  {
    key: "expired",
    label: "Vencidas",
    description: "Suscripciones que ya pasaron su fecha de vencimiento",
    colorClass: "text-red-600 dark:text-red-500",
  },
];

export function SubscriptionStats({ subscriptions }: { subscriptions: AdminDashboardStats["subscriptions"] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {STATS.map((stat) => (
        <div key={stat.key} className="space-y-1 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
          <p className={`text-3xl font-semibold ${stat.colorClass}`}>{subscriptions[stat.key]}</p>
          <p className="text-xs text-muted-foreground">{stat.description}</p>
        </div>
      ))}
    </div>
  );
}
