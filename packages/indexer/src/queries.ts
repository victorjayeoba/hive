import { db } from "./db.js";
import { txUrl, chainConfig } from "@hive/shared";

// Builds the full dashboard snapshot from the projection. Deep-links every tx.
export function snapshot() {
  const tasks = db.prepare(`SELECT * FROM tasks ORDER BY id DESC`).all() as unknown as TaskRow[];
  const agents = db.prepare(`SELECT * FROM agents ORDER BY completed DESC`).all() as unknown as AgentRow[];
  const bidCount = (db.prepare(`SELECT COUNT(*) c FROM bids`).get() as { c: number }).c;
  const txCount = (db.prepare(`SELECT COUNT(*) c FROM txs`).get() as { c: number }).c;

  // Wei values (18 decimals) overflow a JS Number, so sum them with BigInt in JS
  // rather than SUM(CAST(price AS INTEGER)) in SQL (which throws ERR_OUT_OF_RANGE).
  const settledValue = tasks
    .filter((t) => t.status === 5 && t.price)
    .reduce((acc, t) => acc + safeBig(t.price), 0n);

  return {
    tasks: tasks.map((t) => ({
      ...t,
      // Sort bids by price ascending using BigInt comparison (wei-safe).
      bids: (db.prepare(`SELECT worker, price, tx_hash, block FROM bids WHERE task_id = ?`).all(t.id) as unknown as BidRow[])
        .sort((a, b) => (safeBig(a.price) < safeBig(b.price) ? -1 : 1)),
      postedUrl: t.posted_tx ? txUrl(t.posted_tx) : null,
      settledUrl: t.settled_tx ? txUrl(t.settled_tx) : null,
    })),
    agents,
    counters: {
      tasks: tasks.length,
      bids: bidCount,
      txs: txCount,
      settledValue: settledValue.toString(),
      settledCount: tasks.filter((t) => t.status === 5).length,
    },
    explorerBase: chainConfig.explorerBase,
    nativeSymbol: chainConfig.nativeSymbol,
  };
}

interface TaskRow {
  id: number; requester: string; worker: string | null; max_bounty: string;
  price: string | null; status: number; spec_hash: string | null;
  result_hash: string | null; posted_tx: string | null; settled_tx: string | null;
  updated_block: number | null;
}

interface AgentRow {
  address: string; completed: number; timed_out: number; disputed: number; earned: string;
}

interface BidRow {
  worker: string; price: string | null; tx_hash: string; block: number;
}

/** Parse a wei string to BigInt, tolerating null/garbage (returns 0n). */
function safeBig(v: string | null | undefined): bigint {
  if (!v) return 0n;
  try {
    return BigInt(v);
  } catch {
    return 0n;
  }
}
