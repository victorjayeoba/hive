"use client";
import type { Task } from "@/lib/types";
import { formatEther } from "viem";
import { useContent, contentToText } from "@/lib/indexer";

// Vertical lifecycle for one task: spec → posted → bids → awarded → submitted →
// settled/refunded. Each step surfaces its explorer tx where the chain has one.
export function TaskTimeline({ task }: { task: Task }) {
  const spec = useContent(task.spec_hash);
  const result = useContent(task.result_hash);

  const lowest = task.bids.length
    ? task.bids.reduce((min, b) => (BigInt(b.price) < BigInt(min.price) ? b : min), task.bids[0])
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-mono text-sm text-[var(--text)]">Task #{task.id}</h3>
        <p className="mt-0.5 font-mono text-[11px] text-[var(--text-faint)]">
          requester {short(task.requester)} · max {fmt(task.max_bounty)}
        </p>
      </div>

      {/* Spec content */}
      <ContentBlock label="request" loading={spec.loading} notFound={spec.notFound} text={contentToText(spec.value)} />

      {/* Steps */}
      <ol className="relative ml-2 space-y-4 border-l border-[var(--line)] pl-5">
        <Step done label="Posted" tx={task.postedUrl}>
          <span className="font-mono text-xs text-[var(--text-faint)]">on-chain</span>
        </Step>

        <Step done={task.bids.length > 0} label={`Bids (${task.bids.length})`}>
          {task.bids.length === 0 ? (
            <span className="font-mono text-xs text-[var(--text-faint)]">no bids yet</span>
          ) : (
            <div className="space-y-1 rounded-sm border border-[var(--line)] bg-black/20 p-2">
              {task.bids.map((b) => {
                const isLow = lowest && b.tx_hash === lowest.tx_hash;
                return (
                  <div
                    key={b.tx_hash}
                    className={`flex justify-between font-mono text-xs ${isLow ? "text-[var(--amber)]" : "text-[var(--text-faint)]"}`}
                  >
                    <span>
                      {isLow ? "✓ " : "  "}
                      {short(b.worker)}
                    </span>
                    <span className="tabular-nums">{fmt(b.price)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Step>

        <Step done={task.status >= 3} label="Awarded">
          {task.status >= 3 && task.worker ? (
            <span className="font-mono text-xs text-[var(--text-dim)]">
              {short(task.worker)}
              {task.price && <span className="text-[var(--amber)]"> · {fmt(task.price)}</span>}
            </span>
          ) : (
            <span className="font-mono text-xs text-[var(--text-faint)]">pending</span>
          )}
        </Step>

        <Step done={task.status >= 4} label="Submitted">
          {task.status >= 4 && task.result_hash ? (
            <span className="break-all font-mono text-[11px] text-[var(--text-faint)]">{task.result_hash}</span>
          ) : (
            <span className="font-mono text-xs text-[var(--text-faint)]">pending</span>
          )}
        </Step>

        {task.status === 6 ? (
          <Step done label="Refunded" tx={task.settledUrl}>
            <span className="font-mono text-xs text-[var(--text-faint)]">bounty returned to requester</span>
          </Step>
        ) : (
          <Step done={task.status === 5} label="Settled" tx={task.settledUrl}>
            <span className="font-mono text-xs text-[var(--text-faint)]">
              {task.status === 5 ? "paid to worker" : "pending"}
            </span>
          </Step>
        )}
      </ol>

      {/* Result content */}
      {(task.result_hash || result.loading) && (
        <ContentBlock label="result" loading={result.loading} notFound={result.notFound} text={contentToText(result.value)} />
      )}
    </div>
  );
}

function Step({
  done,
  label,
  tx,
  children,
}: {
  done: boolean;
  label: string;
  tx?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative">
      <span
        className={`absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--bg)] ${done ? "bg-[var(--amber)]" : "bg-[var(--line-strong)]"}`}
      />
      <div className="flex items-center gap-2">
        <span className={`font-mono text-xs uppercase tracking-wider ${done ? "text-[var(--text-dim)]" : "text-[var(--text-faint)]"}`}>
          {label}
        </span>
        {tx && (
          <a
            href={tx}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-[var(--text-dim)] underline-offset-2 hover:text-[var(--amber)] hover:underline"
          >
            tx ↗
          </a>
        )}
      </div>
      <div className="mt-1">{children}</div>
    </li>
  );
}

function ContentBlock({
  label,
  loading,
  notFound,
  text,
}: {
  label: string;
  loading: boolean;
  notFound: boolean;
  text: string;
}) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-black/20 p-3">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</p>
      {loading ? (
        <p className="font-mono text-xs text-[var(--text-faint)]">loading…</p>
      ) : notFound || !text ? (
        <p className="font-mono text-xs text-[var(--text-faint)]">— not available</p>
      ) : (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-[var(--text-dim)]">
          {text}
        </pre>
      )}
    </div>
  );
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (wei: string) => Number(formatEther(BigInt(wei))).toFixed(4);
