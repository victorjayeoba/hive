"use client";
import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useLiveSnapshot } from "@/lib/useLiveSnapshot";
import { useHiveStore } from "@/lib/store";
import { Counters } from "@/components/Counters";
import { TaskCard } from "@/components/TaskCard";
import { AgentPanel } from "@/components/AgentPanel";
import "./dashboard.css";

export default function Dashboard() {
  const query = useLiveSnapshot();
  const snapshot = useHiveStore((s) => s.snapshot);
  const connected = useHiveStore((s) => s.connected);
  const [posting, setPosting] = useState(false);

  async function postTask() {
    setPosting(true);
    try {
      await fetch("/api/post-task", { method: "POST" });
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="hive-dash">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      />

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-bee.png" alt="Hive" className="w-7 h-7 object-contain" />
            <span
              className="text-lg font-semibold tracking-tight text-[var(--text)]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Hive
            </span>
            <span className="hidden md:inline text-[11px] text-[var(--text-faint)] font-mono ml-1">
              live market
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <ConnectionPill connected={connected} />
            <button
              onClick={postTask}
              disabled={posting}
              className="shrink-0 rounded-sm bg-[var(--amber)] px-3 py-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#1a1206] hover:bg-[#ffd787] transition-colors disabled:opacity-50"
            >
              {posting ? "posting…" : "Post task"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* ── No data yet: connecting / unreachable state ─────────── */}
        {!snapshot && <ConnectingState isError={query.isError} />}

        {/* ── Live market ─────────────────────────────────────────── */}
        {snapshot && (
          <div className="space-y-8">
            <Counters counters={snapshot.counters} symbol={snapshot.nativeSymbol} />

            <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
              <section>
                <SectionLabel>Task feed</SectionLabel>
                <div className="space-y-3">
                  {snapshot.tasks.length === 0 && (
                    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)]/40 p-8 text-center">
                      <p className="text-sm text-[var(--text-dim)]">
                        No tasks yet — post one, or start the agent swarm.
                      </p>
                    </div>
                  )}
                  {snapshot.tasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              </section>

              <section>
                <SectionLabel>Agents</SectionLabel>
                <AgentPanel agents={snapshot.agents} explorerBase={snapshot.explorerBase} />
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Iconify runtime, in case components use it */}
      <Script
        src="https://cdn.jsdelivr.net/npm/iconify-icon@2.1.0/dist/iconify-icon.min.js"
        strategy="afterInteractive"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-faint)] font-mono">
      {children}
    </h2>
  );
}

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <span className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400 dash-pulse" : "bg-[var(--text-faint)]"}`}
      />
      {connected ? "live" : "connecting"}
    </span>
  );
}

/** Shown until the indexer is reachable. Honest: no fake data, just a clean
 *  waiting state (the backend runs on the VPS). */
function ConnectingState({ isError }: { isError: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)]/30 px-5 py-16 sm:py-20 text-center">
      <div className="mb-6 h-8 w-8 rounded-full border-2 border-[var(--line-strong)] border-t-[var(--amber)] dash-spin" />
      <h2
        className="text-lg sm:text-xl font-medium text-[var(--text)] mb-2"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Connecting to the live market…
      </h2>
      <p className="max-w-md text-sm font-light leading-relaxed text-[var(--text-dim)]">
        Waiting for the on-chain indexer. Once the agent swarm is running, tasks,
        bids, and settlements stream in here block by block.
      </p>
      {isError && (
        <p className="mt-4 text-xs font-mono text-[var(--text-faint)]">
          indexer unreachable — start it, or set NEXT_PUBLIC_INDEXER_HTTP
        </p>
      )}
    </div>
  );
}
