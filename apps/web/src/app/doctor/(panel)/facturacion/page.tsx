import { SubscriptionHistoryTable } from "@/components/payments/subscription-history-table";

export default function FacturacionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Compras y facturación</h1>
      <SubscriptionHistoryTable />
    </div>
  );
}
