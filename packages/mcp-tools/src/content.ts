// Content client — publish/read task content to/from the Hive indexer, keyed by
// its on-chain hash. This is what lets anyone (the Telegram bot, a stranger's
// worker) post a task and have workers read it. Integrity is guaranteed by the
// on-chain hash: readers verify keccak(content) === the hash before trusting it.

import { keccak256, toHex } from "viem";

// Read at CALL time, not import time — the bot loads .env after this module is
// imported, so a module-level const would capture the wrong (default) value.
function indexerBase(): string {
  return process.env.HIVE_INDEXER_HTTP ?? "http://localhost:4000";
}

/** keccak256 of a string — the on-chain content commitment. */
export function hashContent(value: string): `0x${string}` {
  return keccak256(toHex(value));
}

/** Publish a value under its hash key to the indexer content store. */
export async function putContent(key: string, value: unknown): Promise<void> {
  const res = await fetch(`${indexerBase()}/content`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new Error(`content POST failed: ${res.status}`);
}

/** Read content by hash key from the indexer. Returns undefined if absent. */
export async function getContent<T = unknown>(key: string): Promise<T | undefined> {
  const res = await fetch(`${indexerBase()}/content/${encodeURIComponent(key)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`content GET failed: ${res.status}`);
  const { value } = (await res.json()) as { value: T };
  return value;
}

/**
 * Publish a task's spec + input, returning the hashes to post on-chain. Same
 * hashing scheme the swarm's requester uses, so bot-posted and swarm-posted tasks
 * are read the same way by workers.
 */
export interface TaskContent {
  kind: string;
  prompt: string;
  input: string;
}

export async function publishTask(
  spec: TaskContent,
): Promise<{ specHash: `0x${string}`; inputHash: `0x${string}` }> {
  const specHash = hashContent(JSON.stringify({ kind: spec.kind, prompt: spec.prompt }));
  const inputHash = hashContent(spec.input);
  await Promise.all([
    putContent(specHash, spec),
    putContent(inputHash, spec.input),
  ]);
  return { specHash, inputHash };
}

/** Read a task's spec by its specHash (workers use this to know what to do). */
export function readTaskSpec(specHash: string): Promise<TaskContent | undefined> {
  return getContent<TaskContent>(specHash);
}
