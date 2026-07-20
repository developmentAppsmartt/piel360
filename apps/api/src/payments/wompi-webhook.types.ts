/** Payload de `POST /webhooks/wompi` (MIGRACION.md §2.3). */
export interface WompiWebhookPayload {
  event: string;
  data: {
    transaction: {
      id: string;
      status: string;
      amount_in_cents: number;
      reference: string;
    };
  };
  signature: {
    checksum: string;
    properties: string[];
  };
  timestamp: number;
}
