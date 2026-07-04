import OpenAI from "openai";

// A task the requester publishes off-chain; only its hashes go on-chain.
export interface TaskSpec {
  kind: "summarize" | "classify" | "extract";
  prompt: string;
  input: string;
}

const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

function client(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set — worker cannot perform real work");
  return new OpenAI({ apiKey });
}

/// Performs the genuine task with a real model call. The returned string is what
/// gets shown in the UI; its keccak hash is what lands on-chain.
export async function execute(spec: TaskSpec): Promise<string> {
  // Dev-only: exercise the full on-chain loop without an API key. Never used in a
  // submission run — real work requires OPENAI_API_KEY. Clearly disclosed.
  if (process.env.MOCK_LLM === "1") return mockResult(spec);

  const response = await client().chat.completions.create({
    model,
    max_tokens: 512,
    messages: [{ role: "user", content: `${spec.prompt}\n\n---\n${spec.input}` }],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

function mockResult(spec: TaskSpec): string {
  switch (spec.kind) {
    case "summarize": return "BOT Chain is a fast, low-fee EVM L1 for AI and DePIN agents.";
    case "classify": return "negative";
    case "extract": return JSON.stringify({ name: "Ada Lovelace", role: "lead engineer", company: "Analytical Engines Inc." });
    default: return "ok";
  }
}
