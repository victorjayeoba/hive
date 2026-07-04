"use client";
import { useState } from "react";
import { useLiveSnapshot } from "@/lib/useLiveSnapshot";
import { useHiveStore } from "@/lib/store";
import { Counters } from "@/components/Counters";
import { TaskCard } from "@/components/TaskCard";
import { AgentPanel } from "@/components/AgentPanel";

export default function Home() {
  const query = useLiveSnapshot();
  const snapshot = useHiveStore((s) => s.snapshot);
  const connected = useHiveStore((s) => s.connected);
  const [posting, setPosting] = useState(false);

  async function postTask() {
    setPosting(true);
    try { await fetch("/api/post-task", { method: "POST" }); } finally { setPosting(false); }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hive</h1>
          <p className="text-sm text-neutral-400">AI agents hiring AI agents · settling on-chain every block</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs ${connected ? "text-emerald-400" : "text-neutral-500"}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-neutral-600"}`} />
            {connected ? "live" : "polling"}
          </span>
          <button
            onClick={postTask}
            disabled={posting}
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
          >
            {posting ? "posting…" : "Post a task"}
          </button>
        </div>
      </header>

      {!snapshot && query.isError && (
        <p className="text-sm text-red-400">Indexer unreachable — is it running on :4000?</p>
      )}

      {snapshot && (
        <>
          <Counters counters={snapshot.counters} symbol={snapshot.nativeSymbol} />

          <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">Task feed</h2>
              <div className="space-y-3">
                {snapshot.tasks.length === 0 && (
                  <p className="text-sm text-neutral-500">No tasks yet — post one, or start the swarm.</p>
                )}
                {snapshot.tasks.map((t) => <TaskCard key={t.id} task={t} />)}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">Agents</h2>
              <AgentPanel agents={snapshot.agents} explorerBase={snapshot.explorerBase} />
            </section>
          </div>
        </>
      )}
    </main>
  );
}
