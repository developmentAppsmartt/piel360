import { createHash, randomBytes } from 'node:crypto';

/** MIGRACION.md §2.3/`Filament\Doctor\Pages\Subscription` — concatenación
 * plana, sin separadores: reference + amountInCents + currency + secret. */
export function buildWompiIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string,
): string {
  return createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${integritySecret}`)
    .digest('hex');
}

/** `WompiWebhookController` — sha256(transactionId + status + amountInCents + timestamp + secret). */
export function buildWompiWebhookChecksum(
  transactionId: string,
  status: string,
  amountInCents: number,
  timestamp: number,
  webhookSecret: string,
): string {
  return createHash('sha256')
    .update(
      `${transactionId}${status}${amountInCents}${timestamp}${webhookSecret}`,
    )
    .digest('hex');
}

export function generateWompiReference(
  prefix: 'SUB' | 'SUB-PAT' = 'SUB',
): string {
  const rand = randomBytes(3).toString('hex').slice(0, 4).toUpperCase();
  return `${prefix}-${rand}-${Date.now()}`;
}
