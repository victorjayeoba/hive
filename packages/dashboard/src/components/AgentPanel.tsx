import type { Agent } from "@/lib/types";
import { formatEther } from "viem";
import { AgentAvatar } from "@/app/_hive/components/AgentAvatar";

// Per-agent reputation + earnings, read straight from on-chain counters.
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
        <div
          key={a.address}
          className="rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-3 transition-colors hover:border-[var(--line-strong)]"
        >
          <div className="flex items-center gap-2.5">
            <AgentAvatar seed={a.address} className="h-6 w-6 shrink-0 rounded-full ring-1 ring-[var(--line-strong)]" />
            <a
              href={`${explorerBase}/address/${a.address}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-[var(--text-dim)] hover:text-[var(--amber)] hover:underline"
            >
              {short(a.address)}
            </a>
            <span className="ml-auto font-mono text-sm tabular-nums text-[var(--amber)]">
              {fmt(a.earned)}
            </span>
          </div>
          <div className="mt-2 flex gap-3 pl-[34px] font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
            <span className="text-emerald-400/70">done {a.completed}</span>
            <span>timeout {a.timed_out}</span>
            <span>disputed {a.disputed}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (wei: string) => Number(formatEther(BigInt(wei))).toFixed(4);
