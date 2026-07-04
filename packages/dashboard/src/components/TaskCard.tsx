import type { Task } from "@/lib/types";
import { formatEther } from "viem";

const STATUS: Record<number, { label: string; className: string }> = {
  2: { label: "Bidding", className: "bg-[var(--violet)]/15 text-[var(--violet-soft)]" },
  3: { label: "Awarded", className: "bg-[var(--violet)]/15 text-[var(--violet-soft)]" },
  4: { label: "Submitted", className: "bg-white/10 text-[var(--text-dim)]" },
  5: { label: "Settled", className: "bg-[var(--amber)]/15 text-[var(--amber)]" },
  6: { label: "Refunded", className: "bg-white/5 text-[var(--text-faint)]" },
};

// One task's live state: status, the reverse-auction bids, and explorer links.
export function TaskCard({ task }: { task: Task }) {
  const status = STATUS[task.status] ?? { label: "—", className: "bg-white/5 text-[var(--text-faint)]" };
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-4 transition-colors hover:border-[var(--line-strong)]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-[var(--text-dim)]">Task #{task.id}</span>
        <span className={`rounded-sm px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-sm">
        <div>
          <span className="text-[var(--text-faint)]">max </span>
          <span className="tabular-nums text-[var(--text)]">{fmt(task.max_bounty)}</span>
        </div>
        {task.price && (
          <div>
            <span className="text-[var(--text-faint)]">cleared </span>
            <span className="tabular-nums text-[var(--amber)]">{fmt(task.price)}</span>
          </div>
        )}
        {task.worker && (
          <div className="truncate">
            <span className="text-[var(--text-faint)]">worker </span>
            <span className="text-[var(--text-dim)]">{short(task.worker)}</span>
          </div>
        )}
      </div>

      {task.bids.length > 0 && (
        <div className="mt-3 space-y-1 rounded-sm border border-[var(--line)] bg-black/20 p-2">
          {task.bids.map((b, i) => (
            <div
              key={b.tx_hash}
              className={`flex justify-between font-mono text-xs ${i === 0 ? "text-[var(--amber)]" : "text-[var(--text-faint)]"}`}
            >
              <span>
                {i === 0 ? "✓ " : "  "}
                {short(b.worker)}
              </span>
              <span className="tabular-nums">{fmt(b.price)}</span>
            </div>
          ))}
        </div>
      )}

      {(task.postedUrl || task.settledUrl) && (
        <div className="mt-3 flex gap-4 text-xs">
          {task.postedUrl && <ExplorerLink href={task.postedUrl} label="posted" />}
          {task.settledUrl && <ExplorerLink href={task.settledUrl} label="settled" />}
        </div>
      )}
    </div>
  );
}

function ExplorerLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-[var(--text-dim)] underline-offset-2 hover:text-[var(--amber)] hover:underline"
    >
      {label} ↗
    </a>
  );
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (wei: string) => Number(formatEther(BigInt(wei))).toFixed(4);
