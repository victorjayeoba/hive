import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { keccak256, toHex } from "viem";
import type { TaskSpec } from "./execute.js";

// Shared off-chain store: task specs (by hash) and results (by hash). This is the
// content behind the on-chain hashes — the requester publishes here, workers and
// the dashboard read from here. A flat JSON file keeps it dependency-free and
// inspectable; the chain remains the authority for state and money.
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

export function publishSpec(spec: TaskSpec): { specHash: `0x${string}`; inputHash: `0x${string}` } {
  const data = load();
  const specHash = hash(JSON.stringify({ kind: spec.kind, prompt: spec.prompt }));
  const inputHash = hash(spec.input);
  data.specs[specHash] = spec;
  data.inputs[inputHash] = spec.input;
  save(data);
  return { specHash, inputHash };
}

export function readSpec(specHash: string): TaskSpec | undefined {
  return load().specs[specHash];
}

export function publishResult(resultHash: string, result: string): void {
  const data = load();
  data.results[resultHash] = result;
  save(data);
}

export function readResult(resultHash: string): string | undefined {
  return load().results[resultHash];
}
