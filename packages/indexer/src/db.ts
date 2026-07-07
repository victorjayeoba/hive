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

  CREATE TABLE IF NOT EXISTS user_agents (
    exec_address   TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    system_prompt  TEXT NOT NULL,
    owner_address  TEXT NOT NULL,
    payout_address TEXT NOT NULL,
    task_types     TEXT NOT NULL DEFAULT '[]',
    bid_strategy   TEXT NOT NULL DEFAULT '{}',
    status         TEXT NOT NULL DEFAULT 'active',
    created_at     INTEGER NOT NULL,
    created_sig    TEXT
  );

  -- Encrypted execution-wallet private keys, so user agents survive an indexer
  -- restart (the in-memory Map is lost on restart; without this a winning agent
  -- can never submit its work → task stuck at AWARDED → refund). Ciphertext only;
  -- decryptable solely with the server-side EXEC_KEY_SECRET.
  CREATE TABLE IF NOT EXISTS exec_keys (
    exec_address TEXT PRIMARY KEY,
    ciphertext   TEXT NOT NULL,
    created_at   INTEGER NOT NULL
  );
`);

// --- Encrypted exec-key persistence -----------------------------------------

export function saveExecKeyCipher(execAddress: string, ciphertext: string): void {
  db.prepare("INSERT OR REPLACE INTO exec_keys (exec_address, ciphertext, created_at) VALUES (?, ?, ?)").run(
    execAddress.toLowerCase(),
    ciphertext,
    Date.now(),
  );
}

export function loadExecKeyCipher(execAddress: string): string | undefined {
  const r = db.prepare("SELECT ciphertext FROM exec_keys WHERE exec_address = ?").get(execAddress.toLowerCase()) as
    | { ciphertext: string }
    | undefined;
  return r?.ciphertext;
}

// One bid tx emits exactly one BidPlaced event, so tx_hash uniquely identifies a
// bid. Older DBs used a plain INSERT with no constraint, so an indexer restart /
// re-scan could insert the same bid many times (a task showing 25 identical bids).
// Purge any existing duplicates (keep the first rowid per tx_hash) and enforce a
// UNIQUE index so replays become harmless no-ops via INSERT OR IGNORE.
db.exec(`
  DELETE FROM bids
  WHERE rowid NOT IN (SELECT MIN(rowid) FROM bids GROUP BY tx_hash);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_tx ON bids(tx_hash);
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

export interface UserAgentInput {
  execAddress: string;
  name: string;
  systemPrompt: string;
  ownerAddress: string;
  payoutAddress: string;
  taskTypes: string[];
  bidStrategy: Record<string, unknown>;
  createdSig?: string;
}

export interface UserAgentRow {
  execAddress: string;
  name: string;
  systemPrompt: string;
  ownerAddress: string;
  payoutAddress: string;
  taskTypes: string[];
  bidStrategy: Record<string, unknown>;
  status: string;
  createdAt: number;
}

export function insertUserAgent(a: UserAgentInput): void {
  db.prepare(
    `INSERT OR REPLACE INTO user_agents
     (exec_address, name, system_prompt, owner_address, payout_address,
      task_types, bid_strategy, status, created_at, created_sig)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
  ).run(
    a.execAddress.toLowerCase(),
    a.name,
    a.systemPrompt,
    a.ownerAddress.toLowerCase(),
    a.payoutAddress.toLowerCase(),
    JSON.stringify(a.taskTypes),
    JSON.stringify(a.bidStrategy),
    Date.now(),
    a.createdSig ?? null,
  );
}

function rowToUserAgent(r: any): UserAgentRow {
  return {
    execAddress: r.exec_address,
    name: r.name,
    systemPrompt: r.system_prompt,
    ownerAddress: r.owner_address,
    payoutAddress: r.payout_address,
    taskTypes: JSON.parse(r.task_types),
    bidStrategy: JSON.parse(r.bid_strategy),
    status: r.status,
    createdAt: r.created_at,
  };
}

export function getUserAgent(execAddress: string): UserAgentRow | undefined {
  const r = db.prepare("SELECT * FROM user_agents WHERE exec_address = ?").get(execAddress.toLowerCase());
  return r ? rowToUserAgent(r) : undefined;
}

export function listUserAgents(): UserAgentRow[] {
  return (db.prepare("SELECT * FROM user_agents ORDER BY created_at DESC").all() as any[]).map(rowToUserAgent);
}

export function setUserAgentStatus(execAddress: string, status: string): void {
  db.prepare("UPDATE user_agents SET status = ? WHERE exec_address = ?").run(status, execAddress.toLowerCase());
}

export function countAgentsByOwner(ownerAddress: string): number {
  const r = db.prepare("SELECT COUNT(*) c FROM user_agents WHERE owner_address = ?").get(ownerAddress.toLowerCase()) as { c: number };
  return r.c;
}
