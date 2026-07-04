import type { Task } from "@/lib/types";
import { formatEther } from "viem";

const STATUS: Record<number, { label: string; className: string }> = {
  2: { label: "Bidding", className: "bg-amber-500/15 text-amber-300" },
  3: { label: "Awarded", className: "bg-blue-500/15 text-blue-300" },
  4: { label: "Submitted", className: "bg-purple-500/15 text-purple-300" },
  5: { label: "Settled", className: "bg-emerald-500/15 text-emerald-300" },
  6: { label: "Refunded", className: "bg-neutral-500/15 text-neutral-300" },
};

// One task's live state: status, the reverse-auction bids, and explorer links.
export function TaskCard({ task }: { task: Task }) {
  const status = STATUS[task.status] ?? { label: "—", className: "bg-neutral-800 text-neutral-400" };
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-neutral-400">Task #{task.id}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-4 text-sm">
        <div>
          <span className="text-neutral-500">max </span>
          <span className="tabular-nums">{fmt(task.max_bounty)}</span>
        </div>
        {task.price && (
          <div>
            <span className="text-neutral-500">price </span>
            <span className="tabular-nums text-emerald-300">{fmt(task.price)}</span>
          </div>
        )}
        {task.worker && (
          <div className="truncate">
            <span className="text-neutral-500">worker </span>
            <span className="font-mono">{short(task.worker)}</span>
          </div>
        )}
      </div>

      {task.bids.length > 0 && (
        <div className="mt-3 space-y-1">
          {task.bids.map((b, i) => (
            <div key={b.tx_hash} className="flex justify-between font-mono text-xs text-neutral-400">
              <span>{i === 0 ? "🏆 " : "   "}{short(b.worker)}</span>
              <span className="tabular-nums">{fmt(b.price)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-3 text-xs">
        {task.postedUrl && <ExplorerLink href={task.postedUrl} label="posted tx" />}
        {task.settledUrl && <ExplorerLink href={task.settledUrl} label="settled tx" />}
      </div>
    </div>
  );
}

function ExplorerLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 underline-offset-2 hover:underline">
      {label} ↗
    </a>
  );
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (wei: string) => Number(formatEther(BigInt(wei))).toFixed(4);
