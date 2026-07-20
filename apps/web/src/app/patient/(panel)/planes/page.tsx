import { PlansBrowser } from "@/components/payments/plans-browser";
import { SubscriptionHistoryTable } from "@/components/payments/subscription-history-table";

export default function PlanesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Planes y suscripción</h1>
      <PlansBrowser />

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Historial de compras</h2>
        <SubscriptionHistoryTable limit={5} />
      </section>
    </div>
  );
}
