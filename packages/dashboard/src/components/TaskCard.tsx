"use client";
import { useState } from "react";
import type { Task } from "@/lib/types";
import { formatEther } from "viem";
import { TaskTimeline } from "@/components/TaskTimeline";

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
  const [open, setOpen] = useState(false);
  return (
    <>
    <div
      onClick={() => setOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      className="group cursor-pointer rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-4 transition-colors hover:border-[var(--line-strong)]"
    >
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
        {task.price && task.status !== 6 && (
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

      <div className="mt-3 flex items-center gap-4 text-xs">
        {task.postedUrl && <ExplorerLink href={task.postedUrl} label="posted" />}
        {task.settledUrl && <ExplorerLink href={task.settledUrl} label="settled" />}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)] opacity-0 transition-opacity group-hover:opacity-100">
          click for timeline →
        </span>
      </div>
    </div>

    {open && (
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-md border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-2xl"
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-sm px-2 py-0.5 font-mono text-sm text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--amber)]"
          >
            ✕
          </button>
          <TaskTimeline task={task} />
        </div>
      </div>
    )}
    </>
  );
}

function ExplorerLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="font-mono text-[var(--text-dim)] underline-offset-2 hover:text-[var(--amber)] hover:underline"
    >
      {label} ↗
    </a>
  );
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (wei: string) => Number(formatEther(BigInt(wei))).toFixed(4);
