"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  History,
  Info,
  Mail,
  RefreshCw,
  Settings2,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { PlanTeamFeaturesBlock } from "@/components/payments/plan-features-display";
import {
  formatAdminDate,
  formatCOP,
  subscriptionAmount,
  subscriptionBucket,
  subscriptionEndsAtDisplay,
  subscriptionPlanIncludes,
  subscriptionPlanSubtitle,
  subscriptionPurchaseDate,
} from "@/components/payments/subscription-utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Subscription } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";
import {
  BillingCreditsBar,
  BillingPlanAvatar,
  BillingStatusPill,
} from "./billing-plan-row";
import { invoiceRequestHref, printReceipt, receiptReference } from "./billing-receipt";
import { BILLING_THEME, displayCredits } from "./billing-theme";

function formatUpdated(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const label = formatAdminDate(iso);
  return date.toDateString() === new Date().toDateString() ? `Hoy, ${label}` : label;
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Info;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2.5 bg-primary/5 px-4 py-3">
        <Icon className="size-4.5 text-primary" aria-hidden />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </header>
      <div className="divide-y divide-border/70 px-4">{children}</div>
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Info;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

function BillRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Info;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3 text-sm">
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <span className="flex-1 text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function BillingPlanDetailDialog({
  subscription: sub,
  open,
  onOpenChange,
  onOpenHistory,
  showTeamFeatures = false,
  customerName,
}: {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenHistory: () => void;
  showTeamFeatures?: boolean;
  customerName?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-2xl">
        {sub ? (
          <DetailBody
            sub={sub}
            onOpenHistory={onOpenHistory}
            showTeamFeatures={showTeamFeatures}
            customerName={customerName}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({
  sub,
  onOpenHistory,
  showTeamFeatures,
  customerName,
}: {
  sub: Subscription;
  onOpenHistory: () => void;
  showTeamFeatures: boolean;
  customerName?: string | null;
}) {
  const bucket = subscriptionBucket(sub);
  const theme = BILLING_THEME[bucket];
  const { left, total } = displayCredits(sub);
  const limits = sub.plan.analysisLimits ?? {};
  const breakdown = [
    (limits.aesthetic ?? 0) > 0 ? `${limits.aesthetic} estéticos` : null,
    (limits.skiniver ?? 0) > 0 ? `${limits.skiniver} dermatológicos` : null,
  ].filter(Boolean);
  const iva = Number(sub.invoice?.ivaAmount ?? 0);

  return (
    <div className="space-y-4 p-5">
      <div className="pr-8">
        <DialogTitle className="text-base font-semibold text-muted-foreground">
          Detalle del plan
        </DialogTitle>
        <DialogDescription className="sr-only">
          Créditos, información y facturación de {sub.plan.name}
        </DialogDescription>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-4 p-4">
          <BillingPlanAvatar subscription={sub} size="lg" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-foreground">{sub.plan.name}</p>
              <BillingStatusPill subscription={sub} />
            </div>
            <p className="text-sm text-muted-foreground">{subscriptionPlanSubtitle(sub)}</p>
          </div>
        </div>

        <div className={cn("mx-4 space-y-1.5 rounded-xl p-3", theme.soft)}>
          <p className={cn("text-sm font-medium", theme.text)}>Créditos disponibles</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {left} / {total}
          </p>
          <BillingCreditsBar subscription={sub} showNumbers={false} />
        </div>

        <div className="grid grid-cols-2 divide-x divide-border/70 p-4 text-sm">
          <div className="flex items-start gap-2 pr-3">
            <CalendarDays className="mt-0.5 size-4 text-primary" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">Vigencia</p>
              <p className="font-semibold text-foreground">{subscriptionEndsAtDisplay(sub)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 pl-3">
            <RefreshCw className="mt-0.5 size-4 text-primary" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">Última actualización</p>
              <p className="font-semibold text-foreground">
                {formatUpdated(sub.updatedAt ?? sub.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel icon={ClipboardList} title="Información del plan">
          <InfoRow icon={Sparkles} label="Incluye">
            {subscriptionPlanIncludes(sub)}
          </InfoRow>
          <InfoRow icon={FileText} label="Número de análisis">
            {total}
            {breakdown.length > 1 ? (
              <span className="block text-xs font-normal text-muted-foreground">
                {breakdown.join(" · ")}
              </span>
            ) : null}
          </InfoRow>
          <InfoRow icon={CalendarDays} label="Vigencia">
            {subscriptionEndsAtDisplay(sub)}
            {sub.plan.durationDays ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {sub.plan.durationDays} días
              </span>
            ) : null}
          </InfoRow>
          <InfoRow icon={CircleAlert} label="Estado">
            <BillingStatusPill subscription={sub} />
          </InfoRow>
        </Panel>

        <Panel icon={FileText} title="Detalle de facturación">
          <BillRow icon={CreditCard} label="Valor del plan">
            <span className="font-semibold tabular-nums text-foreground">
              {formatCOP(subscriptionAmount(sub))}
            </span>
          </BillRow>
          {iva > 0 ? (
            <BillRow icon={FileText} label="IVA incluido">
              <span className="font-semibold tabular-nums text-foreground">{formatCOP(iva)}</span>
            </BillRow>
          ) : null}
          <BillRow icon={CalendarDays} label="Fecha de compra">
            <span className="font-semibold text-foreground">
              {formatAdminDate(subscriptionPurchaseDate(sub))}
            </span>
          </BillRow>
          <BillRow icon={Info} label="Referencia">
            <span className="max-w-40 truncate font-mono text-xs text-foreground">
              {receiptReference(sub)}
            </span>
          </BillRow>
          <BillRow icon={FileText} label="Factura">
            <button
              type="button"
              onClick={() => {
                if (!printReceipt(sub, customerName)) {
                  window.alert("Permite las ventanas emergentes para ver el comprobante.");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              Ver factura
              <Download className="size-3.5" aria-hidden />
            </button>
          </BillRow>
        </Panel>
      </div>

      {showTeamFeatures ? (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
          <p className="mb-3 inline-flex items-center gap-1.5 font-medium text-foreground">
            <Users className="size-4 text-indigo-700" aria-hidden />
            Equipo y especialidades del plan
          </p>
          <PlanTeamFeaturesBlock plan={sub.plan} />
        </section>
      ) : null}

      <Panel icon={Settings2} title="Acciones">
        <div className="grid gap-2 py-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <History className="size-4 text-primary" aria-hidden />
            <span className="flex-1 text-left">Historial de facturación</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </button>
          <Link
            href="/doctor/planes"
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <ClipboardList className="size-4 text-primary" aria-hidden />
            <span className="flex-1">Gestionar plan</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
          <a
            href={invoiceRequestHref(sub)}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <Mail className="size-4 text-primary" aria-hidden />
            <span className="flex-1">Solicitar factura</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </a>
        </div>
      </Panel>

      <section className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center">
        <Info className="size-5 shrink-0 text-primary" aria-hidden />
        <div className="flex-1">
          <p className="font-semibold text-foreground">¿Necesitas más créditos?</p>
          <p className="text-sm text-muted-foreground">
            Puedes adquirir un nuevo plan o recargar créditos según tu necesidad.
          </p>
        </div>
        <Link
          href="/doctor/planes"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ShoppingCart className="size-4" aria-hidden />
          Comprar créditos
        </Link>
      </section>
    </div>
  );
}
