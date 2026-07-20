import { PlansBrowser } from "@/components/payments/plans-browser";

export default function PlanesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Planes y suscripciones</h1>
      <PlansBrowser />
    </div>
  );
}
