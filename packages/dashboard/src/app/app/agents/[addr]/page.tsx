"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatEther } from "viem";
import { useLiveSnapshot } from "@/lib/useLiveSnapshot";
import { useHiveStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { AgentAvatar } from "@/app/_hive/components/AgentAvatar";
import { INDEXER_HTTP, useContent, contentToText } from "@/lib/indexer";
import type { Agent, Task, UserAgentConfig } from "@/lib/types";
import "../../dashboard.css";

const STATUS_LABEL: Record<number, string> = {
  2: "Bidding",
  3: "Awarded",
  4: "Submitted",
  5: "Settled",
  6: "Refunded",
};

export default function AgentProfile() {
  const params = useParams<{ addr: string }>();
  const addr = (Array.isArray(params.addr) ? params.addr[0] : params.addr) ?? "";
  const addrLc = addr.toLowerCase();

  // Start the live stream, then read the store.
  useLiveSnapshot();
  const snapshot = useHiveStore((s) => s.snapshot);

  const agent: Agent | undefined = snapshot?.agents.find((a) => a.address.toLowerCase() === addrLc);

  // Optional config — 404s for built-in workers; that's fine.
  const [config, setConfig] = useState<UserAgentConfig | null>(null);
  useEffect(() => {
    if (!addr) return;
    let alive = true;
    fetch(`${INDEXER_HTTP}/agents/${encodeURIComponent(addr)}`)
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) {
          setConfig(null);
          return;
        }
        setConfig((await res.json()) as UserAgentConfig);
      })
      .catch(() => alive && setConfig(null));
    return () => {
      alive = false;
    };
  }, [addr]);

  // Job history: tasks this agent won or bid on.
  const jobs: Task[] = (snapshot?.tasks ?? []).filter(
    (t) =>
      t.worker?.toLowerCase() === addrLc || t.bids?.some((b) => b.worker.toLowerCase() === addrLc),
  );
  const won = jobs.filter((t) => t.worker?.toLowerCase() === addrLc);

  return (
    <div className="hive-dash min-h-screen">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      <AppHeader />
      <main className="mx-auto max-w-4xl px-5 py-8 space-y-8">
        <Link
          href="/app"
          className="inline-block font-mono text-xs text-[var(--text-dim)] hover:text-[var(--amber)]"
        >
          ← back to market
        </Link>

        {!snapshot && (
          <p className="font-mono text-sm text-[var(--text-dim)]">Connecting to the live market…</p>
        )}

        {snapshot && !agent && (
          <div className="rounded-md border border-[var(--line)] bg-[var(--panel)]/40 p-8 text-center">
            <p className="text-sm text-[var(--text-dim)]">
              No agent found for <span className="font-mono">{short(addr)}</span> yet.
            </p>
          </div>
        )}

        {snapshot && agent && (
          <>
            {/* Identity */}
            <section className="rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-5">
              <div className="flex items-center gap-3">
                <AgentAvatar
                  seed={agent.address}
                  className="h-12 w-12 shrink-0 rounded-full ring-1 ring-[var(--line-strong)]"
                />
                <div className="min-w-0">
                  <h1
                    className="truncate text-xl font-semibold text-[var(--text)]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {agent.name || short(agent.address)}
                  </h1>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-faint)]">
                    <span>{agent.role}</span>
                    <span>·</span>
                    <LiveStatus status={agent.liveStatus} />
                  </div>
                </div>
                <a
                  href={`${snapshot.explorerBase}/address/${agent.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto shrink-0 font-mono text-xs text-[var(--text-dim)] hover:text-[var(--amber)] hover:underline"
                >
                  {short(agent.address)} ↗
                </a>
              </div>

              {(agent.owner || agent.payout) && (
                <div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-4 font-mono text-xs sm:grid-cols-2">
                  {agent.owner && (
                    <Field label="owner" value={short(agent.owner)} title={agent.owner} />
                  )}
                  {agent.payout && (
                    <Field label="payout" value={short(agent.payout)} title={agent.payout} />
                  )}
                </div>
              )}
            </section>

            {/* Reputation */}
            <section>
              <SectionLabel>Reputation</SectionLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Stat label="completed" value={String(agent.completed)} />
                <Stat label="reliability" value={`${Math.round(agent.reliability)}%`} />
                <Stat label="timed out" value={String(agent.timedOut)} />
                <Stat label="disputed" value={String(agent.disputed)} />
                <Stat label="earned" value={fmt(agent.earned)} accent />
              </div>
            </section>

            {/* Config (user agents only) */}
            {config && (
              <section>
                <SectionLabel>Configuration</SectionLabel>
                <div className="space-y-3 rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-4">
                  <div>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                      system prompt
                    </p>
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs text-[var(--text-dim)]">
                      {config.systemPrompt}
                    </pre>
                  </div>
                  {config.taskTypes?.length > 0 && (
                    <div>
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                        task types
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {config.taskTypes.map((t) => (
                          <span
                            key={t}
                            className="rounded-sm border border-[var(--line)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-dim)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                      strategy
                    </p>
                    <span className="font-mono text-xs text-[var(--text-dim)]">
                      {typeof (config.bidStrategy as { type?: string })?.type === "string"
                        ? (config.bidStrategy as { type?: string }).type
                        : JSON.stringify(config.bidStrategy)}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Work output (won tasks with spec/result) */}
            {won.length > 0 && (
              <section>
                <SectionLabel>Work output</SectionLabel>
                <div className="space-y-3">
                  {won.map((t) => (
                    <WorkOutput key={t.id} task={t} />
                  ))}
                </div>
              </section>
            )}

            {/* Job history */}
            <section>
              <SectionLabel>Job history</SectionLabel>
              {jobs.length === 0 ? (
                <div className="rounded-md border border-[var(--line)] bg-[var(--panel)]/40 p-6 text-center">
                  <p className="text-sm text-[var(--text-dim)]">No jobs yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {jobs.map((t) => {
                    const isWorker = t.worker?.toLowerCase() === addrLc;
                    return (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-3 font-mono text-xs"
                      >
                        <span className="text-[var(--text-dim)]">Task #{t.id}</span>
                        <span className="text-[var(--text-faint)]">
                          {STATUS_LABEL[t.status] ?? "—"}
                        </span>
                        <span className="text-[var(--text-faint)]">
                          {isWorker ? "won" : "bid"}
                        </span>
                        <span className="ml-auto flex gap-3">
                          {t.postedUrl && <TxLink href={t.postedUrl} label="posted" />}
                          {t.settledUrl && <TxLink href={t.settledUrl} label="settled" />}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// One won task's spec + result, fetched from the content store.
function WorkOutput({ task }: { task: Task }) {
  const spec = useContent(task.spec_hash);
  const result = useContent(task.result_hash);
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-4">
      <div className="mb-2 flex items-center justify-between font-mono text-xs">
        <span className="text-[var(--text-dim)]">Task #{task.id}</span>
        <span className="text-[var(--text-faint)]">{STATUS_LABEL[task.status] ?? "—"}</span>
      </div>
      <ContentBlock label="request" loading={spec.loading} notFound={spec.notFound} text={contentToText(spec.value)} />
      <div className="mt-3">
        <ContentBlock
          label="result"
          loading={result.loading}
          notFound={result.notFound}
          text={contentToText(result.value)}
        />
      </div>
    </div>
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
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</p>
      {loading ? (
        <p className="font-mono text-xs text-[var(--text-faint)]">loading…</p>
      ) : notFound || !text ? (
        <p className="font-mono text-xs text-[var(--text-faint)]">— not available</p>
      ) : (
        <pre className="whitespace-pre-wrap break-words font-mono text-xs text-[var(--text-dim)]">{text}</pre>
      )}
    </div>
  );
}

function LiveStatus({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const color = s.startsWith("working")
    ? "bg-emerald-400"
    : s.startsWith("bidding")
      ? "bg-[var(--amber)]"
      : "bg-[var(--text-faint)]";
  const pulse = s.startsWith("working") || s.startsWith("bidding") ? "dash-pulse" : "";
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color} ${pulse}`} />
      {status || "idle"}
    </span>
  );
}

function Field({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex gap-2" title={title}>
      <span className="text-[var(--text-faint)]">{label}</span>
      <span className="truncate text-[var(--text-dim)]">{value}</span>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</p>
      <p className={`mt-1 font-mono text-lg tabular-nums ${accent ? "text-[var(--amber)]" : "text-[var(--text)]"}`}>
        {value}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">
      {children}
    </h2>
  );
}

function TxLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[var(--text-dim)] underline-offset-2 hover:text-[var(--amber)] hover:underline"
    >
      {label} ↗
    </a>
  );
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (wei: string) => Number(formatEther(BigInt(wei))).toFixed(4);
