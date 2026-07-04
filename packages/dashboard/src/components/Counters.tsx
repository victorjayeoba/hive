import type { Counters as C } from "@/lib/types";
import { formatEther } from "viem";

// The "marketplace is alive" panel: totals that tick up as the swarm runs.
export function Counters({ counters, symbol }: { counters: C; symbol: string }) {
  const stats = [
    { label: "Tasks", value: counters.tasks },
    { label: "Settled", value: counters.settledCount },
    { label: "Bids", value: counters.bids },
    { label: "Total txs", value: counters.txs },
    { label: `Value settled (${symbol})`, value: fmt(counters.settledValue) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-neutral-400">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function fmt(wei: string): string {
  const eth = Number(formatEther(BigInt(wei)));
  return eth.toFixed(4);
}
