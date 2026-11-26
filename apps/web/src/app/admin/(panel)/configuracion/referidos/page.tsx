import { ReferralReport } from "@/components/referrals/referral-report";

export default function AdminReferidosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Referidos</h1>
        <p className="text-sm text-muted-foreground">
          Profesionales registrados con URL, QR o código de una empresa aliada.
        </p>
      </div>
      <ReferralReport endpoint="/admin/referrals" withOrganization />
    </div>
  );
}
