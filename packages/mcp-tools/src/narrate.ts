// Plain-English narration over REAL chain data.
//
// The tools return structured facts (score, balance, findings, decoded params) —
// all pulled live from BOT Chain, never invented. This helper adds a short
// human-readable verdict on top, so a non-expert instantly understands what the
// numbers mean. The LLM only NARRATES the data it's given; it must not add facts.
//
// If OPENAI_API_KEY is missing (or the call fails), narration is skipped and the
// caller just shows the structured card — the tools never depend on the LLM.

import OpenAI from "openai";

const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

let cached: OpenAI | null = null;
function client(): OpenAI | null {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  cached = new OpenAI({ apiKey });
  return cached;
}

/**
 * Turn structured chain data into 2-3 plain sentences. `role` frames the voice
 * (risk analyst, tx explainer). Returns "" if no API key or on any error — the
 * caller shows the card without narration rather than failing.
 */
export async function narrate(role: string, data: unknown, maxSentences = 3): Promise<string> {
  const ai = client();
  if (!ai) return "";
  try {
    const res = await ai.chat.completions.create({
      model,
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            `You are ${role}. You are given structured, factual BOT Chain data. ` +
            `Write ${maxSentences} short, clear sentences a non-expert understands. ` +
            `Only describe what the data shows — never invent numbers, names, or facts ` +
            `not present in the data. No preamble, no markdown headers — just the plain verdict.`,
        },
        { role: "user", content: JSON.stringify(data) },
      ],
    });
    return res.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return ""; // narration is best-effort; the structured card stands on its own
  }
}
