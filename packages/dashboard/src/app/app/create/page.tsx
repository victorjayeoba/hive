"use client";
import Link from "next/link";
import { useState } from "react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { AppHeader } from "@/components/AppHeader";
import { createAgentMessage } from "@/lib/agent-message";
import { INDEXER_HTTP } from "@/lib/indexer";
import "../dashboard.css";

// The task kinds workers currently know how to perform (see @hive/agents execute.ts).
const TASK_KINDS = [
  { id: "analyze-wallet", label: "wallet-risk" },
  { id: "explain-tx", label: "explain-tx" },
  { id: "summarize", label: "summarize" },
  { id: "classify", label: "classify" },
  { id: "extract", label: "extract" },
];

const STRATEGIES = [
  { id: "conservative", blurb: "bid high, only on sure things" },
  { id: "balanced", blurb: "sensible margins, broad coverage" },
  { id: "aggressive", blurb: "undercut hard to win volume" },
] as const;

type StrategyId = (typeof STRATEGIES)[number]["id"];

const PROMPT_PLACEHOLDER =
  "e.g. You are a careful on-chain risk analyst. Given BOT Chain data, write a short, " +
  "specific risk assessment for a non-expert in 4-6 sentences. Cite concrete findings.";

export default function CreateAgent() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [taskTypes, setTaskTypes] = useState<string[]>(["analyze-wallet"]);
  const [strategy, setStrategy] = useState<StrategyId>("balanced");
  const [payout, setPayout] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [execAddress, setExecAddress] = useState<string | null>(null);

  const payoutAddress = payout.trim() || address || "";

  function toggleType(id: string) {
    setTaskTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function submit() {
    setError(null);
    if (!address) {
      setError("connect a wallet first");
      return;
    }
    if (!name.trim() || !systemPrompt.trim()) {
      setError("name and system prompt are required");
      return;
    }
    if (taskTypes.length === 0) {
      setError("pick at least one task type");
      return;
    }
    setSubmitting(true);
    try {
      const message = createAgentMessage(address, payoutAddress);
      const signature = await signMessageAsync({ message });
      const res = await fetch(`${INDEXER_HTTP}/agents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          systemPrompt: systemPrompt.trim(),
          ownerAddress: address,
          payoutAddress,
          taskTypes,
          bidStrategy: { type: strategy },
          signature,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; execAddress?: string; error?: string };
      if (body.ok && body.execAddress) {
        setExecAddress(body.execAddress);
      } else {
        setError(body.error ?? "failed to create agent");
      }
    } catch (e) {
      setError((e as Error).message ?? "signing failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="hive-dash min-h-screen">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      <AppHeader />
      <main className="mx-auto max-w-2xl px-5 py-8 space-y-6">
        <div>
          <Link href="/app" className="font-mono text-xs text-[var(--text-dim)] hover:text-[var(--amber)]">
            ← back to market
          </Link>
          <h1
            className="mt-3 text-2xl font-semibold text-[var(--text)]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Create a worker agent
          </h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            Configure an autonomous worker. Hive runs it, it bids on matching tasks, and earnings
            settle to your payout address.
          </p>
        </div>

        {/* Success */}
        {execAddress ? (
          <div className="rounded-md border border-[var(--amber)]/40 bg-[var(--amber)]/5 p-5 text-center">
            <p className="text-sm text-[var(--text)]">Agent created.</p>
            <p className="mt-1 font-mono text-xs text-[var(--text-dim)]">{execAddress}</p>
            <Link
              href={`/app/agents/${execAddress}`}
              className="mt-4 inline-block rounded-sm bg-[var(--amber)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#1a1206]"
            >
              View agent profile →
            </Link>
          </div>
        ) : !isConnected ? (
          /* Step 1: connect */
          <div className="rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-8 text-center">
            <p className="mb-4 text-sm text-[var(--text-dim)]">Connect your wallet to create an agent.</p>
            <button
              onClick={() => connect({ connector: injected() })}
              className="rounded-sm border border-[var(--amber)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--amber)]"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          /* Step 2: configure */
          <div className="space-y-5 rounded-md border border-[var(--line)] bg-[var(--panel)]/50 p-5">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sentinel Risk Analyst"
                className={inputCls}
              />
            </Field>

            <Field label="System prompt" hint="How the agent should behave when it performs work.">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={PROMPT_PLACEHOLDER}
                rows={5}
                className={`${inputCls} resize-y`}
              />
            </Field>

            <Field label="Task types" hint="What kinds of tasks it will bid on.">
              <div className="flex flex-wrap gap-2">
                {TASK_KINDS.map((k) => {
                  const on = taskTypes.includes(k.id);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => toggleType(k.id)}
                      className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors ${
                        on
                          ? "border-[var(--amber)] bg-[var(--amber)]/10 text-[var(--amber)]"
                          : "border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line-strong)]"
                      }`}
                    >
                      {on ? "✓ " : ""}
                      {k.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Strategy">
              <div className="space-y-2">
                {STRATEGIES.map((s) => (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-sm border p-3 transition-colors ${
                      strategy === s.id ? "border-[var(--amber)] bg-[var(--amber)]/5" : "border-[var(--line)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === s.id}
                      onChange={() => setStrategy(s.id)}
                      className="accent-[var(--amber)]"
                    />
                    <span className="font-mono text-xs capitalize text-[var(--text)]">{s.id}</span>
                    <span className="font-mono text-[11px] text-[var(--text-faint)]">— {s.blurb}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Payout address" hint="Where earnings settle. Defaults to your connected wallet.">
              <input
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
                placeholder={address ?? "0x…"}
                className={`${inputCls} font-mono`}
              />
            </Field>

            {error && (
              <p className="rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-sm bg-[var(--amber)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#1a1206] transition-colors hover:bg-[#ffd787] disabled:opacity-50"
            >
              {submitting ? "signing & creating…" : "Sign & create agent"}
            </button>
            <p className="text-center font-mono text-[11px] text-[var(--text-faint)]">
              You'll sign a message authorizing Hive to run this agent. No gas, no transaction.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-sm border border-[var(--line)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--amber)]";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
        {label}
      </label>
      {hint && <p className="mb-2 text-xs text-[var(--text-dim)]">{hint}</p>}
      {children}
    </div>
  );
}
