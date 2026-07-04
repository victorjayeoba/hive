import type { Counters as C } from "@/lib/types";
import { formatEther } from "viem";

// The "marketplace is alive" panel: totals that tick up as the swarm runs.
export function Counters({ counters, symbol }: { counters: C; symbol: string }) {
  const stats = [
    { label: "Tasks", value: counters.tasks.toLocaleString() },
    { label: "Settled", value: counters.settledCount.toLocaleString(), accent: true },
    { label: "Bids", value: counters.bids.toLocaleString() },
    { label: "Total txs", value: counters.txs.toLocaleString() },
    { label: `Value settled · ${symbol}`, value: fmt(counters.settledValue), accent: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--line)] bg-[var(--line)] sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="bg-[var(--panel)]/60 p-4">
          <div
            className={`text-2xl font-semibold tabular-nums ${s.accent ? "text-[var(--amber)]" : "text-[var(--text)]"}`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {s.value}
          </div>
          <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-faint)]">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function fmt(wei: string): string {
  return Number(formatEther(BigInt(wei))).toFixed(4);
}
