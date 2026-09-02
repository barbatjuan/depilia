export type ReceivableSaleRow = {
  clientId: string;
  clientName: string;
  saleId: string;
  balance: number;
  soldAt: string;
};

export type ReceivableClientRow = {
  clientId: string;
  clientName: string;
  owed: number;
  saleCount: number;
  oldestUnpaidAt: string;
};

export type ReceivablesBucket = "0-30" | "31-60" | "61+";

export type Receivables = {
  clients: ReceivableClientRow[];
  buckets: Record<ReceivablesBucket, number>;
  grandTotal: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function bucketFor(oldestUnpaidAt: string, now: Date): ReceivablesBucket {
  const days = Math.floor((now.getTime() - new Date(oldestUnpaidAt).getTime()) / DAY_MS);
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  return "61+";
}

/**
 * Point-in-time accounts-receivable rollup (spec: PASO 6). Groups open,
 * balance-owing sales by client, ranked by amount owed desc, plus an aging
 * bucket (by the client's OLDEST unpaid sale) for the header summary.
 */
export function buildReceivables(rows: ReceivableSaleRow[], now: Date): Receivables {
  const byClient = new Map<
    string,
    { clientName: string; owed: number; saleCount: number; oldestUnpaidAt: string }
  >();

  for (const row of rows) {
    const acc = byClient.get(row.clientId) ?? {
      clientName: row.clientName,
      owed: 0,
      saleCount: 0,
      oldestUnpaidAt: row.soldAt,
    };
    acc.owed += row.balance;
    acc.saleCount += 1;
    if (row.soldAt < acc.oldestUnpaidAt) acc.oldestUnpaidAt = row.soldAt;
    byClient.set(row.clientId, acc);
  }

  const clients = [...byClient.entries()]
    .map(([clientId, v]) => ({ clientId, ...v }))
    .sort((a, b) => b.owed - a.owed);

  const buckets: Record<ReceivablesBucket, number> = {
    "0-30": 0,
    "31-60": 0,
    "61+": 0,
  };
  for (const client of clients) {
    buckets[bucketFor(client.oldestUnpaidAt, now)] += client.owed;
  }

  const grandTotal = clients.reduce((sum, c) => sum + c.owed, 0);

  return { clients, buckets, grandTotal };
}
