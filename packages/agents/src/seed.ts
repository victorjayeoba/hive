import type { TaskSpec } from "./execute.js";

// Real task specs with real inputs. The work performed on these is genuine; only
// the result hash goes on-chain. Kept small and fast so the demo stays snappy.
export function seedTasks(): TaskSpec[] {
  return [
    {
      kind: "summarize",
      prompt: "Summarize the following text in one sentence of at most 20 words.",
      input:
        "BOT Chain is an EVM-compatible layer-1 blockchain built for AI and DePIN applications, " +
        "featuring near-zero transaction fees and sub-second block times so that autonomous agents " +
        "can transact economically and settle work in real time.",
    },
    {
      kind: "classify",
      prompt: "Classify the sentiment of this text as exactly one word: positive, negative, or neutral.",
      input: "The new update completely broke my workflow and support has been unresponsive.",
    },
    {
      kind: "extract",
      prompt:
        "Extract the fields to compact JSON with keys name, role, company. Return only JSON.",
      input: "Ada Lovelace works as a lead engineer at Analytical Engines Inc.",
    },
  ];
}
