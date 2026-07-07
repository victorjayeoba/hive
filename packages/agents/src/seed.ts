import type { TaskSpec } from "./execute.js";

// Real task specs with real inputs. The work performed is genuine; only the result
// hash goes on-chain. The on-chain tasks (analyze-wallet / explain-tx) are the
// differentiated ones — the worker pulls REAL BOT Chain data via Hive's toolkit
// and reasons over it, which no single API call can do.
export function seedTasks(): TaskSpec[] {
  return [
    // --- On-chain tasks (the wedge): worker reads BOT Chain + reasons ---
    {
      kind: "analyze-wallet",
      prompt: "Analyze this BOT Chain wallet and give a plain-English risk assessment.",
      // The HiveMarket contract itself — a real, active on-chain address.
      input: "0x31fc3688295309a2a08627ddd1d65deeee85c201",
    },
    {
      kind: "analyze-wallet",
      prompt: "Assess the risk profile of this wallet for someone about to transact with it.",
      // A live worker wallet from the swarm.
      input: "0x9DAa8724b708C60EcCA147D990CB499493004b3e",
    },
    {
      kind: "explain-tx",
      prompt: "Explain in plain English what this BOT Chain transaction did.",
      // The HiveMarket deploy tx — a real on-chain transaction.
      input: "0xf903a9159ee945f3d6d2f6f2a8d0a11d7d1c4f2c08cac017c92bd284fc99b1f6",
    },

    // --- Text tasks: plain LLM work (kept for variety) ---
    {
      kind: "summarize",
      prompt: "Summarize the following text in one sentence of at most 20 words.",
      input:
        "BOT Chain is an EVM-compatible layer-1 blockchain built for AI and DePIN applications, " +
        "featuring near-zero transaction fees and sub-second block times so that autonomous agents " +
        "can transact economically and settle work in real time.",
    },
    {
      kind: "extract",
      prompt:
        "Extract the fields to compact JSON with keys name, role, company. Return only JSON.",
      input: "Ada Lovelace works as a lead engineer at Analytical Engines Inc.",
    },
  ];
}
