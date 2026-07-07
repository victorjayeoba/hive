// Task content store served by the indexer. The chain holds only hashes; this is
// where the actual spec/input (and results) live so ANY worker — the swarm, a
// stranger's, or the Telegram bot's tasks — can read a task by its hash over HTTP.
//
// Trust model: the hash is on-chain, so a worker verifies fetched content against
// it (keccak(content) === specHash). The indexer is a convenient host, not a
// trusted authority for integrity. Decentralizing this (IPFS) changes only WHERE
// content lives, not the model.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const file = resolve(dirname(fileURLToPath(import.meta.url)), "../content.json");

type Store = Record<string, unknown>;
let store: Store = load();

function load(): Store {
  try {
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Store) : {};
  } catch {
    return {};
  }
}
function persist() {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(store));
  } catch {
    /* best-effort; content is re-postable */
  }
}

/** Store a value under its hash key (spec, input, or result). */
export function putContent(key: string, value: unknown): void {
  store[key] = value;
  persist();
}

/** Read content by hash key. */
export function getContent(key: string): unknown | undefined {
  return store[key];
}
