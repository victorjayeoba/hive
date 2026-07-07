import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { keccak256, toHex } from "viem";
import { putContent, getContent } from "@hive/mcp-tools/content";
import type { TaskSpec } from "./execute.js";

// Off-chain content store behind the on-chain hashes. Two layers:
//   - a local JSON file (fast path for the co-located swarm)
//   - the indexer content store over HTTP (so ANY worker — and the Telegram bot's
//     tasks — can publish/read content, not just co-located agents)
// The chain hash is the authority; content is verifiable against it.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.hive-store");

interface StoreShape {
  specs: Record<string, TaskSpec>;
  inputs: Record<string, string>;
  results: Record<string, string>;
}

function load(): StoreShape {
  const file = resolve(root, "store.json");
  if (!existsSync(file)) return { specs: {}, inputs: {}, results: {} };
  return JSON.parse(readFileSync(file, "utf8"));
}

function save(data: StoreShape): void {
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  writeFileSync(resolve(root, "store.json"), JSON.stringify(data, null, 2));
}

export function hash(value: string): `0x${string}` {
  return keccak256(toHex(value));
}

/** Publish a spec to both the local store and the indexer (so any worker can read it). */
export function publishSpec(spec: TaskSpec): { specHash: `0x${string}`; inputHash: `0x${string}` } {
  const data = load();
  const specHash = hash(JSON.stringify({ kind: spec.kind, prompt: spec.prompt }));
  const inputHash = hash(spec.input);
  data.specs[specHash] = spec;
  data.inputs[inputHash] = spec.input;
  save(data);
  // Mirror to the indexer (best-effort; the local copy is the fast path).
  void putContent(specHash, spec).catch(() => {});
  void putContent(inputHash, spec.input).catch(() => {});
  return { specHash, inputHash };
}

/** Read a spec: local file first, then the indexer (for bot-/stranger-posted tasks). */
export async function readSpec(specHash: string): Promise<TaskSpec | undefined> {
  const local = load().specs[specHash];
  if (local) return local;
  return getContent<TaskSpec>(specHash).catch(() => undefined);
}

/** Publish a result to both the local store and the indexer (so the requester/bot can read it). */
export function publishResult(resultHash: string, result: string): void {
  const data = load();
  data.results[resultHash] = result;
  save(data);
  void putContent(resultHash, result).catch(() => {});
}

/** Read a result: local file first, then the indexer. */
export async function readResult(resultHash: string): Promise<string | undefined> {
  const local = load().results[resultHash];
  if (local) return local;
  return getContent<string>(resultHash).catch(() => undefined);
}
