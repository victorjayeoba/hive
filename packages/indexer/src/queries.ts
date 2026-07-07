import { db } from "./db.js";
import { listUserAgents } from "./db.js";
import { txUrl, chainConfig } from "@hive/shared";

export interface RosterAgent {
  address: string;
  name: string;
  role: "user-agent" | "worker" | "requester";
  completed: number;
  timedOut: number;
  disputed: number;
  earned: string;
  reliability: number; // 0..100
  liveStatus: string;  // "idle" | "bidding #N" | "working #N"
  owner?: string;
  payout?: string;
}

// Deterministic display name from an address when the agent isn't user-named.
function generatedName(address: string): string {
  const palette = ["Amber", "Cobalt", "Jade", "Coral", "Onyx", "Slate", "Rust", "Ivory"];
  let n = 0;
  try { n = Number(BigInt(address) % BigInt(palette.length)); } catch { n = address.length % palette.length; }
  const suffix = address.slice(-2);
  return `Worker ${palette[n]}-${suffix}`;
}

export function buildRoster(): RosterAgent[] {
  const tasks = db.prepare("SELECT id, worker, status FROM tasks").all() as { id: number; worker: string | null; status: number }[];
  const bids = db.prepare("SELECT DISTINCT worker, task_id FROM bids").all() as { worker: string; task_id: number }[];
  const rep = db.prepare("SELECT * FROM agents").all() as { address: string; completed: number; timed_out: number; disputed: number; earned: string }[];
  const users = listUserAgents();

  const addrs = new Set<string>();
  bids.forEach((b) => addrs.add(b.worker.toLowerCase()));
  rep.forEach((r) => addrs.add(r.address.toLowerCase()));
  users.forEach((u) => addrs.add(u.execAddress.toLowerCase()));

  function liveStatus(addr: string): string {
    const working = tasks.find((t) => t.worker?.toLowerCase() === addr && (t.status === 3 || t.status === 4));
    if (working) return `working #${working.id}`;
    const biddingTask = bids.find(
      (b) => b.worker.toLowerCase() === addr && tasks.find((t) => t.id === b.task_id && t.status === 2),
    );
    if (biddingTask) return `bidding #${biddingTask.task_id}`;
    return "idle";
  }

  return [...addrs].map((addr) => {
    const r = rep.find((x) => x.address.toLowerCase() === addr);
    const u = users.find((x) => x.execAddress.toLowerCase() === addr);
    const completed = r?.completed ?? 0;
    const timedOut = r?.timed_out ?? 0;
    const disputed = r?.disputed ?? 0;
    const total = completed + timedOut + disputed;
    return {
      address: addr,
      name: u?.name ?? generatedName(addr),
      role: u ? "user-agent" : "worker",
      completed,
      timedOut,
      disputed,
      earned: r?.earned ?? "0",
      reliability: total === 0 ? 100 : Math.round((completed / total) * 100),
      liveStatus: liveStatus(addr),
      owner: u?.ownerAddress,
      payout: u?.payoutAddress,
    } satisfies RosterAgent;
  });
}

// Builds the full dashboard snapshot from the projection. Deep-links every tx.
export function snapshot() {
  const tasks = db.prepare(`SELECT * FROM tasks ORDER BY id DESC`).all() as unknown as TaskRow[];
  const agents = buildRoster().sort((a, b) => b.completed - a.completed);
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
