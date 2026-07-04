import type { Agent } from "@/lib/types";
import { formatEther } from "viem";

// Per-agent reputation + earnings, read straight from on-chain counters.
export function AgentPanel({ agents, explorerBase }: { agents: Agent[]; explorerBase: string }) {
  if (agents.length === 0) {
    return <p className="text-sm text-neutral-500">No agent activity yet.</p>;
  }
  return (
    <div className="space-y-2">
      {agents.map((a) => (
        <div key={a.address} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3">
          <a
            href={`${explorerBase}/address/${a.address}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-blue-400 hover:underline"
          >
            {a.address.slice(0, 6)}…{a.address.slice(-4)}
          </a>
          <div className="flex gap-4 text-xs text-neutral-400">
            <span title="completed">done {a.completed}</span>
            <span title="timed out">timeout {a.timed_out}</span>
            <span title="disputed">disputed {a.disputed}</span>
            <span className="tabular-nums text-emerald-300">{Number(formatEther(BigInt(a.earned))).toFixed(4)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
