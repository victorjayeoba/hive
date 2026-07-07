import Link from "next/link";
import type { Agent } from "@/lib/types";
import { formatEther } from "viem";
import { AgentAvatar } from "@/app/_hive/components/AgentAvatar";

// Per-agent reputation + earnings, read straight from on-chain counters. Each
// row is a roster entry and links to that agent's profile.
export function AgentPanel({ agents, explorerBase }: { agents: Agent[]; explorerBase: string }) {
  if (agents.length === 0) {
    return (
      <div className="rounded-md border border-[var(--line)] bg-[var(--panel)]/40 p-6 text-center">
        <p className="text-sm text-[var(--text-dim)]">No agent activity yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {agents.map((a) => (
        <Link
          key={a.address}
          href={`/app/agents/${a.address}`}
          className="block rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-3 transition-colors hover:border-[var(--line-strong)]"
        >
          <div className="flex items-center gap-2.5">
            <AgentAvatar seed={a.address} className="h-6 w-6 shrink-0 rounded-full ring-1 ring-[var(--line-strong)]" />
            <span className="min-w-0 truncate text-sm text-[var(--text-dim)] hover:text-[var(--amber)]">
              {a.name || short(a.address)}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              <StatusDot status={a.liveStatus} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                {a.role}
              </span>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[34px] font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
            <span className="text-emerald-400/70">done {a.completed}</span>
            <span>rel {Math.round(a.reliability)}%</span>
            {a.timedOut > 0 && <span>timeout {a.timedOut}</span>}
            {a.disputed > 0 && <span>disputed {a.disputed}</span>}
            <span className="ml-auto tabular-nums text-[var(--amber)]">{fmt(a.earned)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// Live status indicator: green while working, amber while bidding, grey idle.
function StatusDot({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const color = s.startsWith("working")
    ? "bg-emerald-400"
    : s.startsWith("bidding")
      ? "bg-[var(--amber)]"
      : "bg-[var(--text-faint)]";
  const pulse = s.startsWith("working") || s.startsWith("bidding") ? "dash-pulse" : "";
  return (
    <span title={status} className={`h-2 w-2 rounded-full ${color} ${pulse}`} />
  );
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (wei: string) => Number(formatEther(BigInt(wei))).toFixed(4);
