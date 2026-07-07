import OpenAI from "openai";
import { assessWalletRisk, decodeTransaction, getWalletOverview } from "@hive/mcp-tools/tools";

// A task the requester publishes off-chain; only its hashes go on-chain.
// Two families:
//   - text tasks  (summarize/classify/extract): a plain LLM call
//   - on-chain tasks (analyze-wallet/explain-tx): the worker calls Hive's on-chain
//     tools to pull REAL BOT Chain data, then reasons over it with the LLM. This is
//     the "an agent, not an API reseller" work — no single API call can do it.
export interface TaskSpec {
  kind: "summarize" | "classify" | "extract" | "analyze-wallet" | "explain-tx";
  prompt: string;
  input: string; // for on-chain tasks this is the target address / tx hash
}

const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

function client(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set — worker cannot perform real work");
  return new OpenAI({ apiKey });
}

// Default system prompts per task family. A user agent may override the system
// message via `systemPrompt`; when it's undefined the behavior is unchanged.
const RISK_SYSTEM_PROMPT =
  "You are an on-chain risk analyst. Given structured BOT Chain data, write a short, " +
  "clear risk assessment for a non-expert. Be specific and cite the findings. 4-6 sentences.";
const EXPLAIN_TX_SYSTEM_PROMPT =
  "You explain blockchain transactions in plain English for a non-expert. " +
  "Given decoded transaction data, say what happened in 3-5 clear sentences.";

/// Performs the genuine task. The returned string is what gets shown in the UI;
/// its keccak hash is what lands on-chain. `systemPrompt`, when provided by a
/// user agent, overrides the default system message for the LLM call.
export async function execute(spec: TaskSpec, systemPrompt?: string): Promise<string> {
  if (process.env.MOCK_LLM === "1") return mockResult(spec);

  switch (spec.kind) {
    case "analyze-wallet":
      return analyzeWallet(spec, systemPrompt);
    case "explain-tx":
      return explainTx(spec, systemPrompt);
    default:
      return textTask(spec, systemPrompt);
  }
}

/** Plain LLM task (summarize / classify / extract). */
async function textTask(spec: TaskSpec, systemPrompt?: string): Promise<string> {
  // Text tasks have no default system message; only add one if the agent supplies it.
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }]
    : [];
  messages.push({ role: "user", content: `${spec.prompt}\n\n---\n${spec.input}` });
  const response = await client().chat.completions.create({
    model,
    max_tokens: 512,
    messages,
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

/** On-chain: pull real risk data via the toolkit, then have the LLM write the report. */
async function analyzeWallet(spec: TaskSpec, systemPrompt?: string): Promise<string> {
  const address = extractAddress(spec.input);
  if (!address) return "Invalid task: no wallet address provided.";

  const report = await assessWalletRisk(address); // real BOT Chain data
  const response = await client().chat.completions.create({
    model,
    max_tokens: 400,
    messages: [
      { role: "system", content: systemPrompt ?? RISK_SYSTEM_PROMPT },
      { role: "user", content: `${spec.prompt}\n\nData:\n${JSON.stringify(report)}` },
    ],
  });
  const summary = response.choices[0]?.message?.content?.trim() ?? "";
  // Return both the human summary and the structured score so results are verifiable.
  return `RISK ${report.level.toUpperCase()} (${report.score}/100)\n\n${summary}`;
}

/** On-chain: decode a real transaction, then have the LLM explain it plainly. */
async function explainTx(spec: TaskSpec, systemPrompt?: string): Promise<string> {
  const hash = extractTxHash(spec.input);
  if (!hash) return "Invalid task: no transaction hash provided.";

  const decoded = await decodeTransaction(hash); // real BOT Chain data
  const response = await client().chat.completions.create({
    model,
    max_tokens: 350,
    messages: [
      { role: "system", content: systemPrompt ?? EXPLAIN_TX_SYSTEM_PROMPT },
      { role: "user", content: `${spec.prompt}\n\nDecoded tx:\n${JSON.stringify(decoded)}` },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

const extractAddress = (s: string) => s.match(/0x[a-fA-F0-9]{40}/)?.[0];
const extractTxHash = (s: string) => s.match(/0x[a-fA-F0-9]{64}/)?.[0];

async function mockResult(spec: TaskSpec): Promise<string> {
  switch (spec.kind) {
    case "summarize": return "BOT Chain is a fast, low-fee EVM L1 for AI and DePIN agents.";
    case "classify": return "negative";
    case "extract": return JSON.stringify({ name: "Ada Lovelace", role: "lead engineer", company: "Analytical Engines Inc." });
    case "analyze-wallet": {
      // Even the mock pulls real data so the demo is honest without an LLM key.
      const address = extractAddress(spec.input);
      if (!address) return "Invalid task: no wallet address.";
      const r = await getWalletOverview(address);
      return `RISK ${r.isScam ? "HIGH" : "LOW"} — balance ${r.balance}, contract=${r.isContract}, scam=${r.isScam}.`;
    }
    case "explain-tx": return "This transaction called a contract method and completed successfully.";
    default: return "ok";
  }
}
