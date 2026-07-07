import type { Snapshot } from "./types";

export interface ActivityItem { label: string; href: string | null; kind: string; }

// Newest-first stream of real market events derived from the snapshot.
export function deriveActivity(snap: Snapshot, limit: number): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const t of snap.tasks) {
    if (t.settledUrl) items.push({ label: `Task #${t.id} settled → ${t.price} wei to ${short(t.worker)}`, href: t.settledUrl, kind: "settle" });
    for (const b of t.bids ?? []) items.push({ label: `Bid ${b.price} on #${t.id} by ${short(b.worker)}`, href: linkTx(snap, b.tx_hash), kind: "bid" });
    if (t.postedUrl) items.push({ label: `Task #${t.id} posted`, href: t.postedUrl, kind: "post" });
  }
  return items.slice(0, limit);
}

function short(a: string | null | undefined) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—"; }
function linkTx(snap: Snapshot, hash: string) { return `${snap.explorerBase}/tx/${hash}`; }
