"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Subscription } from "@/lib/queries/subscriptions";
import { SubscriptionDetailBody } from "./subscription-detail-card";

export function SubscriptionDetailDialog({
  subscription,
  open,
  onOpenChange,
  showTeamFeatures = false,
}: {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showTeamFeatures?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de suscripción</DialogTitle>
        </DialogHeader>
        {subscription ? (
          <SubscriptionDetailBody
            subscription={subscription}
            showTeamFeatures={showTeamFeatures}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
