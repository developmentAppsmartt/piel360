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
