export type AnalisisPiel360CreditHistoryItem = {
  id: string;
  timestampMs: number;
  action: string;
  targetId: string | null;
  delta: number;
  dstActions: string[];
};

type HistoryRow = {
  id?: number | string;
  timestamp?: number;
  action?: string;
  target_id?: string;
  info?: {
    credits?: Array<{ amount?: number; amount_dec?: number }>;
    dst_actions?: string[];
  };
};

const PAGE_SIZE = 30;
/** Una sola página de 30 esconde la compra cuando hay muchos análisis. */
const MAX_PAGES = 15;

/**
 * `GET /s2s/v1.0/client/credit/history`.
 * Sin `Content-Type: application/json` el proveedor responde 415 y la bolsa
 * muestra el historial estético vacío.
 */
export async function fetchAnalisisPiel360CreditHistory(input: {
  baseUrl: string;
  apiKey: string;
  onError: (response: Response) => Promise<never>;
}): Promise<AnalisisPiel360CreditHistoryItem[]> {
  const items: AnalisisPiel360CreditHistoryItem[] = [];
  let startingToken: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(`${input.baseUrl}/s2s/v1.0/client/credit/history`);
    url.searchParams.set('page_size', String(PAGE_SIZE));
    if (startingToken) url.searchParams.set('starting_token', startingToken);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) await input.onError(response);

    const json = (await response.json()) as {
      result?: { next_token?: string | null; history?: HistoryRow[] };
    };
    const history = json.result?.history ?? [];
    for (const row of history) items.push(mapHistoryRow(row));

    const next = json.result?.next_token ?? null;
    if (!next || history.length === 0) break;
    startingToken = next;
  }

  return items;
}

const AESTHETIC_RECHARGE_MS = 300 * 24 * 60 * 60 * 1000;
const EXPIRING_SOON_MS = 30 * 24 * 60 * 60 * 1000;

/** Compra de unidades. Un análisis y su devolución no entran a la bolsa. */
export function isAestheticBagPurchase(
  item: AnalisisPiel360CreditHistoryItem,
): boolean {
  if (item.delta <= 0 || item.action.endsWith('_failed')) return false;
  return (
    !item.action.includes('skin_analysis') &&
    !item.action.includes('fitzpatrick')
  );
}

function rechargeStillCounts(
  item: AnalisisPiel360CreditHistoryItem,
  now: number,
): boolean {
  if (!isAestheticBagPurchase(item)) return false;
  if (!item.timestampMs) return true;
  return now - item.timestampMs < AESTHETIC_RECHARGE_MS;
}

/** Recargas vigentes: 300 días desde el ingreso, sin los cobros de cada análisis. */
export function aestheticRechargeCredits(
  history: AnalisisPiel360CreditHistoryItem[],
  now = Date.now(),
): number {
  return history.reduce((sum, item) => {
    if (!rechargeStillCounts(item, now)) return sum;
    return sum + item.delta;
  }, 0);
}

/**
 * Saldo que el proveedor todavía deja consumir.
 * El historial de compras suma recargas viejas ya gastadas o vencidas;
 * el saldo en vivo es el que coincide con la plataforma.
 */
export function consumableAestheticBalance(
  balances: Array<{ amount: number; expiryMs: number | null }>,
  now = Date.now(),
): { live: number; expiringSoon: number } {
  let live = 0;
  let expiringSoon = 0;
  for (const row of balances) {
    if (!Number.isFinite(row.amount) || row.amount <= 0) continue;
    if (row.expiryMs != null && row.expiryMs <= now) continue;
    live += row.amount;
    if (row.expiryMs != null && row.expiryMs - now <= EXPIRING_SOON_MS) {
      expiringSoon += row.amount;
    }
  }
  return { live, expiringSoon };
}

export function aestheticRechargesExpiringSoon(
  history: AnalisisPiel360CreditHistoryItem[],
  now = Date.now(),
): number {
  return history.reduce((sum, item) => {
    if (!rechargeStillCounts(item, now) || !item.timestampMs) return sum;
    const left = item.timestampMs + AESTHETIC_RECHARGE_MS - now;
    if (left > EXPIRING_SOON_MS) return sum;
    return sum + item.delta;
  }, 0);
}

function mapHistoryRow(row: HistoryRow): AnalisisPiel360CreditHistoryItem {
  const delta = (row.info?.credits ?? []).reduce((sum, credit) => {
    return sum + Number(credit.amount_dec ?? credit.amount ?? 0);
  }, 0);
  return {
    id: String(row.id ?? ''),
    timestampMs: Number(row.timestamp ?? 0),
    action: row.action ?? 'unknown',
    targetId: row.target_id ?? null,
    delta,
    dstActions: row.info?.dst_actions ?? [],
  };
}
