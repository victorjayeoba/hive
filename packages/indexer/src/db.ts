import { DatabaseSync } from "node:sqlite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// SQLite projection of on-chain events, via Node's built-in node:sqlite (no native
// build step). Pure read-side: everything here is re-derivable from the chain, so
// it's safe to delete and rebuild from the deploy block. Every row carries the
// txHash that produced it for explorer deep-links.
const dbPath = resolve(dirname(fileURLToPath(import.meta.url)), "../hive.db");
export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY,
    requester    TEXT NOT NULL,
    worker       TEXT,
    max_bounty   TEXT NOT NULL,
    price        TEXT,
    status       INTEGER NOT NULL,
    spec_hash    TEXT,
    result_hash  TEXT,
    posted_tx    TEXT,
    settled_tx   TEXT,
    updated_block INTEGER
  );

  CREATE TABLE IF NOT EXISTS bids (
    task_id  INTEGER NOT NULL,
    worker   TEXT NOT NULL,
    price    TEXT NOT NULL,
    tx_hash  TEXT NOT NULL,
    block    INTEGER
  );

  CREATE TABLE IF NOT EXISTS agents (
    address     TEXT PRIMARY KEY,
    completed   INTEGER DEFAULT 0,
    timed_out   INTEGER DEFAULT 0,
    disputed    INTEGER DEFAULT 0,
    earned      TEXT DEFAULT '0'
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS txs (
    hash      TEXT PRIMARY KEY,
    kind      TEXT NOT NULL,
    gas_used  TEXT,
    block     INTEGER
  );
`);

// Wipe the projection if the deployed market address changed (fresh deploy), so a
// new contract never shows stale tasks from a previous run.
export function resetIfNewDeployment(marketAddress: string): void {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'market'").get() as { value: string } | undefined;
  if (row && row.value.toLowerCase() !== marketAddress.toLowerCase()) {
    db.exec("DELETE FROM tasks; DELETE FROM bids; DELETE FROM agents; DELETE FROM txs; DELETE FROM meta;");
  }
  db.prepare("INSERT INTO meta (key, value) VALUES ('market', ?) ON CONFLICT(key) DO UPDATE SET value = ?")
    .run(marketAddress, marketAddress);
}

export function getCursor(fallback: bigint): bigint {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'cursor'").get() as { value: string } | undefined;
  return row ? BigInt(row.value) : fallback;
}

export function setCursor(block: bigint): void {
  db.prepare("INSERT INTO meta (key, value) VALUES ('cursor', ?) ON CONFLICT(key) DO UPDATE SET value = ?")
    .run(block.toString(), block.toString());
}

export function bumpAgent(address: string, field: "completed" | "timed_out" | "disputed"): void {
  db.prepare(`INSERT INTO agents (address, ${field}) VALUES (?, 1)
              ON CONFLICT(address) DO UPDATE SET ${field} = ${field} + 1`).run(address);
}

export function addEarned(address: string, amount: bigint): void {
  const row = db.prepare("SELECT earned FROM agents WHERE address = ?").get(address) as { earned: string } | undefined;
  const total = (row ? BigInt(row.earned) : 0n) + amount;
  db.prepare(`INSERT INTO agents (address, earned) VALUES (?, ?)
              ON CONFLICT(address) DO UPDATE SET earned = ?`).run(address, total.toString(), total.toString());
}

export function recordTx(hash: string, kind: string, gasUsed: bigint | undefined, block: bigint): void {
  db.prepare("INSERT OR IGNORE INTO txs (hash, kind, gas_used, block) VALUES (?, ?, ?, ?)")
    .run(hash, kind, gasUsed?.toString() ?? null, Number(block));
}
