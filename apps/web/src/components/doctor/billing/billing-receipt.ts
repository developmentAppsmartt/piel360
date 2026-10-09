import {
  formatAdminDate,
  formatCOP,
  subscriptionAmount,
  subscriptionPlanSubtitle,
  subscriptionPurchaseDate,
} from "@/components/payments/subscription-utils";
import type { Subscription } from "@/lib/queries/subscriptions";

export const BILLING_SUPPORT_EMAIL = "soporte@piel360.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function receiptReference(sub: Subscription): string {
  return sub.wompiTransactionId?.trim() || `SUB-${sub.id}`;
}

export function receiptLines(sub: Subscription): [string, string][] {
  const iva = Number(sub.invoice?.ivaAmount ?? 0);
  const base = Number(sub.invoice?.planBaseAmount ?? 0);
  return [
    ["Plan", sub.plan.name],
    ["Tipo", subscriptionPlanSubtitle(sub)],
    ["Análisis incluidos", String(sub.plan.analysisLimit)],
    ["Fecha de compra", formatAdminDate(subscriptionPurchaseDate(sub))],
    ...(iva > 0 && base > 0
      ? ([
          ["Subtotal", formatCOP(base)],
          ["IVA", formatCOP(iva)],
        ] as [string, string][])
      : []),
    ["Total pagado", formatCOP(subscriptionAmount(sub))],
    ["Referencia de pago", receiptReference(sub)],
  ];
}

/** Abre el comprobante en una ventana lista para imprimir o guardar como PDF. */
export function printReceipt(sub: Subscription, customerName?: string | null) {
  const win = window.open("", "_blank", "width=720,height=860");
  if (!win) return false;
  const rows = receiptLines(sub)
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  win.document.write(`<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>Comprobante ${escapeHtml(receiptReference(sub))}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #0f172a; margin: 40px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #0f3d73; }
  p { margin: 0; color: #64748b; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
  td { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
  td:last-child { text-align: right; font-weight: 600; }
  .foot { margin-top: 28px; font-size: 12px; }
</style></head><body>
  <h1>Comprobante de compra · Piel 360</h1>
  <p>${customerName ? `${escapeHtml(customerName)} · ` : ""}Emitido el ${escapeHtml(formatAdminDate(new Date().toISOString()))}</p>
  <table>${rows}</table>
  <p class="foot">Pago procesado a través de Wompi. Este comprobante no reemplaza la factura electrónica; para solicitarla escribe a ${BILLING_SUPPORT_EMAIL} con la referencia de pago.</p>
  <script>window.onload = () => window.print();</script>
</body></html>`);
  win.document.close();
  return true;
}

export function invoiceRequestHref(sub: Subscription): string {
  const subject = encodeURIComponent(`Factura ${sub.plan.name} (${receiptReference(sub)})`);
  const body = encodeURIComponent(
    `Hola, solicito la factura electrónica de mi compra.\n\n${receiptLines(sub)
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n")}`,
  );
  return `mailto:${BILLING_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
