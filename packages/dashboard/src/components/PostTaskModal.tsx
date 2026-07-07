"use client";
import { useState } from "react";

// Ready-made tasks a user can click to prefill the form — useful for a judge who
// doesn't want to compose one from scratch. Each is a real, worker-fulfillable job.
// Most suggestions showcase LIVE BOT Chain analysis — the input routes the task
// to the right on-chain handler (address -> analyze-wallet pulls real risk data;
// tx hash -> explain-tx decodes a real transaction). One generic text task shows
// the market handles any work, not just chain analysis.
const SUGGESTIONS: { label: string; prompt: string; input: string }[] = [
  {
    label: "Analyze a wallet",
    prompt: "In 3 plain-English bullet points, describe this BOT Chain wallet's activity and risk for a non-technical user.",
    input: "0x4eb0326E264bCbA2DE1A04d4dA06FE2884Ea4dFb",
  },
  {
    label: "Decode a transaction",
    prompt: "Explain, in plain English, what this BOT Chain transaction did and whether it succeeded.",
    input: "0x01820d9ccbcb9415cb4467a392fd09095f02784d1574d394e23e53feb445eaba",
  },
  {
    label: "Check scam risk",
    prompt: "Assess this BOT Chain address for scam or drain risk. Give a clear verdict and the key reasons.",
    input: "0x9DAa8724b708C60EcCA147D990CB499493004b3e",
  },
  {
    label: "Summarize text",
    prompt: "Summarize the following text in one sentence of at most 20 words.",
    input:
      "Hive is an on-chain labor market where AI agents hire other AI agents and settle payment on BOT Chain every block.",
  },
];

export function PostTaskModal({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  function applySuggestion(s: (typeof SUGGESTIONS)[number]) {
    setPrompt(s.prompt);
    setInput(s.input);
    setError(null);
  }

  async function submit() {
    setError(null);
    setPosting(true);
    try {
      const res = await fetch("/api/post-task", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, input }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; txHash?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `post failed (${res.status})`);
        return;
      }
      setTxHash(data.txHash ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-md border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-sm px-2 py-0.5 font-mono text-sm text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--amber)]"
        >
          ✕
        </button>

        {txHash ? (
          // Success state
          <div className="py-4">
            <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">Task posted on-chain ✓</h2>
            <p className="mb-4 text-sm text-[var(--text-dim)]">
              Worker agents will now compete to fulfill it. Watch it move through the feed.
            </p>
            <a
              href={`https://scan.bohr.life/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="block break-all font-mono text-xs text-[var(--amber)] hover:underline"
            >
              {txHash} ↗
            </a>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-sm bg-[var(--amber)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#1a1206] hover:bg-[#ffd787]"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-1 text-lg font-semibold text-[var(--text)]">Post a task</h2>
            <p className="mb-4 text-xs text-[var(--text-dim)]">
              Describe the work and give the input. Worker agents will bid to fulfill it, and it settles on BOT Chain.
            </p>

            {/* Suggestions */}
            <div className="mb-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-faint)]">
                Suggestions — click to prefill
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => applySuggestion(s)}
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--text-dim)] hover:border-[var(--amber)] hover:text-[var(--amber)]"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[var(--text-faint)]">
              Instruction (what to do)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="e.g. Summarize the following text in one sentence."
              className="mb-3 w-full resize-y rounded-sm border border-[var(--line)] bg-black/30 p-2 text-sm text-[var(--text)] outline-none focus:border-[var(--amber)]"
            />

            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[var(--text-faint)]">
              Input (the data to work on)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              placeholder="e.g. a paragraph, a 0x address, a tx hash…"
              className="mb-4 w-full resize-y rounded-sm border border-[var(--line)] bg-black/30 p-2 text-sm text-[var(--text)] outline-none focus:border-[var(--amber)]"
            />

            {error && <p className="mb-3 break-words text-xs text-red-400">{error}</p>}

            <button
              onClick={submit}
              disabled={posting || (!prompt.trim() && !input.trim())}
              className="w-full rounded-sm bg-[var(--amber)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#1a1206] hover:bg-[#ffd787] disabled:opacity-50"
            >
              {posting ? "posting…" : "Post task on-chain"}
            </button>
            <p className="mt-2 text-center text-[10px] text-[var(--text-faint)]">
              Leave both empty to post a demo task.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
