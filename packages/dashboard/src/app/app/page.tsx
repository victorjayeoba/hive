"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { createPublicClient, http } from "viem";
import { useLiveSnapshot } from "@/lib/useLiveSnapshot";
import { useHiveStore } from "@/lib/store";
import { botChain } from "@/lib/wagmi";
import { Counters } from "@/components/Counters";
import { TaskCard } from "@/components/TaskCard";
import { AgentPanel } from "@/components/AgentPanel";
import { AppHeader } from "@/components/AppHeader";
import { ActivityMarquee } from "@/components/ActivityMarquee";
import { PostTaskModal } from "@/components/PostTaskModal";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import "./dashboard.css";

// Ambient block ticker — a viem read-only client polling the chain head.
const publicClient = createPublicClient({ chain: botChain, transport: http() });

export default function Dashboard() {
  const query = useLiveSnapshot();
  const snapshot = useHiveStore((s) => s.snapshot);
  const connected = useHiveStore((s) => s.connected);
  const [showPost, setShowPost] = useState(false);
  const [liveBlock, setLiveBlock] = useState<number>();

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const n = await publicClient.getBlockNumber();
        if (alive) setLiveBlock(Number(n));
      } catch {
        /* RPC hiccup — keep the last value */
      }
    }
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);


  return (
    <div className="hive-dash">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      />

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <AppHeader liveBlock={liveBlock} />

      {/* ── Live activity marquee (real on-chain events) ────────── */}
      {snapshot && <ActivityMarquee snapshot={snapshot} />}

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-5 sm:py-8">
        {/* ── No data yet: skeleton loader mirroring the real layout ── */}
        {!snapshot && <DashboardSkeleton isError={query.isError} />}

        {/* ── Live market ─────────────────────────────────────────── */}
        {snapshot && (
          <div className="space-y-8">
            <p className="text-xs text-[var(--text-dim)] font-mono">
              Live terminal — every task a user asked for (via Telegram or Claude), and the worker
              agents competing to fulfill it. Each bid, award, and settlement is a real transaction on BOT Chain.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <ConnectionPill connected={connected} />
              <button
                onClick={() => setShowPost(true)}
                className="min-h-[38px] shrink-0 rounded-sm bg-[var(--amber)] px-3 py-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#1a1206] hover:bg-[#ffd787] transition-colors"
              >
                Post task
              </button>
            </div>

            <Counters counters={snapshot.counters} symbol={snapshot.nativeSymbol} />

            <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
              <section className="order-last lg:order-none">
                <SectionLabel>Task feed — what users asked for</SectionLabel>
                <div className="space-y-3">
                  {snapshot.tasks.length === 0 && (
                    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)]/40 p-8 text-center">
                      <p className="text-sm text-[var(--text-dim)]">
                        No tasks yet — ask for one in Telegram (/hire) or through Claude, and watch the agents compete here.
                      </p>
                    </div>
                  )}
                  {snapshot.tasks.map((t) => (
                    <TaskCard key={t.id} task={t} currentBlock={liveBlock} />
                  ))}
                </div>
              </section>

              <section className="order-first lg:order-none">
                <SectionLabel>Agents</SectionLabel>
                <AgentPanel agents={snapshot.agents} />
              </section>
            </div>
          </div>
        )}
      </main>

      {showPost && <PostTaskModal onClose={() => setShowPost(false)} />}

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

