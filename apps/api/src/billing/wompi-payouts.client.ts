import { randomUUID } from 'node:crypto';

export type WompiPayoutEnvironment = 'sandbox' | 'production';

export type WompiPayoutCredentials = {
  apiKey: string;
  userPrincipalId: string;
  accountId: string;
  environment: WompiPayoutEnvironment;
};

export type WompiBank = {
  id: string;
  name: string;
  code?: string;
};

export type WompiPayoutTransactionInput = {
  legalIdType: string;
  legalId: string;
  bankId: string;
  accountType: 'AHORROS' | 'CORRIENTE';
  accountNumber: string;
  name: string;
  email: string;
  /** Monto en centavos COP (ej. $10.000 = 1000000). */
  amount: number;
  reference: string;
};

export type CreateWompiPayoutBatchInput = {
  reference: string;
  paymentType?: 'PAYROLL' | 'PROVIDERS' | 'OTHER';
  transactions: WompiPayoutTransactionInput[];
  /** Solo sandbox: fuerza estado final. */
  transactionStatus?: 'APPROVED' | 'FAILED';
};

export type WompiPayoutBatchResponse = {
  id?: string;
  reference?: string;
  status?: string;
  raw: unknown;
};

function baseUrl(environment: WompiPayoutEnvironment) {
  return environment === 'production'
    ? 'https://api.payouts.wompi.co/v1'
    : 'https://api.sandbox.payouts.wompi.co/v1';
}

function authHeaders(creds: WompiPayoutCredentials, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-api-key': creds.apiKey,
    'user-principal-id': creds.userPrincipalId,
  };
  if (idempotencyKey) {
    headers['idempotency-key'] = idempotencyKey;
  }
  return headers;
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickId(payload: unknown): string | undefined {
  const root = asRecord(payload);
  if (!root) return undefined;
  if (typeof root.id === 'string') return root.id;
  const data = asRecord(root.data);
  if (data && typeof data.id === 'string') return data.id;
  return undefined;
}

function pickStatus(payload: unknown): string | undefined {
  const root = asRecord(payload);
  if (!root) return undefined;
  if (typeof root.status === 'string') return root.status;
  const data = asRecord(root.data);
  if (data && typeof data.status === 'string') return data.status;
  return undefined;
}

function normalizeBanks(payload: unknown): WompiBank[] {
  const root = asRecord(payload);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root?.banks)
        ? root.banks
        : [];

  return list.flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    const id = String(row.id ?? row.bankId ?? '');
    const name = String(row.name ?? row.bankName ?? row.nombre ?? '');
    if (!id || !name) return [];
    const bank: WompiBank = {
      id,
      name,
      ...(row.code != null ? { code: String(row.code) } : {}),
    };
    return [bank];
  });
}

export class WompiPayoutsClient {
  constructor(private readonly creds: WompiPayoutCredentials) {}

  async listBanks(): Promise<WompiBank[]> {
    const res = await fetch(`${baseUrl(this.creds.environment)}/banks`, {
      method: 'GET',
      headers: authHeaders(this.creds),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      throw new Error(
        `Wompi banks ${res.status}: ${JSON.stringify(body).slice(0, 400)}`,
      );
    }
    return normalizeBanks(body);
  }

  async createPayoutBatch(
    input: CreateWompiPayoutBatchInput,
  ): Promise<WompiPayoutBatchResponse> {
    const payload: Record<string, unknown> = {
      reference: input.reference,
      accountId: this.creds.accountId,
      paymentType: input.paymentType ?? 'PROVIDERS',
      transactions: input.transactions,
    };
    if (this.creds.environment === 'sandbox' && input.transactionStatus) {
      payload.transactionStatus = input.transactionStatus;
    }

    const res = await fetch(`${baseUrl(this.creds.environment)}/payouts`, {
      method: 'POST',
      headers: authHeaders(this.creds, randomUUID()),
      body: JSON.stringify(payload),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      throw new Error(
        `Wompi payouts ${res.status}: ${JSON.stringify(body).slice(0, 600)}`,
      );
    }
    return {
      id: pickId(body),
      reference:
        (asRecord(body)?.reference as string | undefined) ??
        (asRecord(asRecord(body)?.data)?.reference as string | undefined) ??
        input.reference,
      status: pickStatus(body),
      raw: body,
    };
  }

  async getPayoutBatch(payoutId: string): Promise<WompiPayoutBatchResponse> {
    const res = await fetch(
      `${baseUrl(this.creds.environment)}/payouts/${encodeURIComponent(payoutId)}`,
      {
        method: 'GET',
        headers: authHeaders(this.creds),
      },
    );
    const body = await parseJson(res);
    if (!res.ok) {
      throw new Error(
        `Wompi payout get ${res.status}: ${JSON.stringify(body).slice(0, 400)}`,
      );
    }
    return {
      id: pickId(body) ?? payoutId,
      reference: asRecord(body)?.reference as string | undefined,
      status: pickStatus(body),
      raw: body,
    };
  }
}

/** Convierte COP (decimal pesos) a centavos enteros para la API. */
export function copToWompiCents(amountCop: number): number {
  return Math.round(amountCop * 100);
}
