# Hive Agent Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-facing agent platform (create your own autonomous worker agent that earns real BOT on-chain) on top of the existing, deployed Hive market, and redesign `/app` into a live, "alive" market terminal.

**Architecture:** No smart-contract changes. A "user agent" is an off-chain construct: a managed execution wallet (server-held key) that bids/works autonomously, plus a system prompt and an owner/payout wallet. A new agent registry lives in the indexer; the worker runtime is generalized to run user agents; the dashboard gains wallet-connect, a create flow, agent profiles, and a redesigned live terminal. Earnings sweep on-chain to the user's wallet.

**Tech Stack:** TypeScript, Node `node:sqlite`, viem/wagmi, Next.js 15 + Tailwind + Zustand + TanStack Query, Vitest (new), Foundry (existing, unchanged).

---

## Reference: Source of Truth

- Design spec: `docs/superpowers/specs/2026-07-07-hive-agent-platform-design.md`
- Live chain: BOT Chain 968, RPC `https://rpc.bohr.life`, explorer `https://scan.bohr.life`
- HiveMarket: `0x31fc3688295309a2a08627ddd1d65deeee85c201`
- Key existing files:
  - `packages/indexer/src/{index,queries,poller,db,content}.ts`
  - `packages/agents/src/{worker,execute,store,chain}.ts`
  - `packages/dashboard/src/lib/{types,store,useLiveSnapshot}.ts`
  - `packages/dashboard/src/app/app/page.tsx`
  - `packages/dashboard/src/components/{TaskCard,AgentPanel,Counters}.tsx`

## Parallelization Map

Tasks in the same **Phase** touch disjoint files and can run in parallel. Phases are sequential (later phases depend on earlier interfaces).

- **Phase 0** (Task 0): shared test setup — must run first, blocks everything.
- **Phase 1** (Tasks 1–4): backend — registry, roster fix, runtime, sweep. Parallel-safe within phase except where noted.
- **Phase 2** (Tasks 5–6): shared types + wallet layer. Parallel-safe.
- **Phase 3** (Tasks 7–11): dashboard UI. Parallel-safe within phase.
- **Phase 4** (Task 12): live wiring + end-to-end verification on 968.

---

## Phase 0 — Test Infrastructure

### Task 0: Add Vitest to the workspace

**Files:**
- Modify: `package.json` (root, add vitest devDep + test script)
- Create: `vitest.config.ts`
- Create: `packages/indexer/src/__tests__/smoke.test.ts`

- [ ] **Step 1: Install vitest at the root**

Run:
```bash
pnpm add -Dw vitest@^2.1.0
```
Expected: vitest added to root `devDependencies`, lockfile updated.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment for backend packages; dashboard tests opt into jsdom per-file.
    environment: "node",
    include: ["packages/**/src/**/*.test.ts", "packages/**/src/**/__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "packages/contracts/**"],
  },
});
```

- [ ] **Step 3: Add a root test script**

In root `package.json` `scripts`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test**

`packages/indexer/src/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `pnpm test`
Expected: PASS, 1 test passed.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts packages/indexer/src/__tests__/smoke.test.ts
git commit -m "test: add vitest workspace test harness"
```

---

## Phase 1 — Backend: Registry, Roster, Runtime, Sweep

### Task 1: Agent registry table + DB helpers

**Files:**
- Modify: `packages/indexer/src/db.ts` (add `user_agents` table + helper fns)
- Test: `packages/indexer/src/__tests__/user-agents.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/indexer/src/__tests__/user-agents.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { insertUserAgent, listUserAgents, getUserAgent, db } from "../db.js";

describe("user_agents registry", () => {
  beforeEach(() => {
    db.exec("DELETE FROM user_agents");
  });

  it("inserts and reads back an agent", () => {
    insertUserAgent({
      execAddress: "0xexec",
      name: "RiskBot",
      systemPrompt: "You assess wallet risk.",
      ownerAddress: "0xowner",
      payoutAddress: "0xpayout",
      taskTypes: ["wallet-risk"],
      bidStrategy: { type: "balanced" },
      createdSig: "0xsig",
    });
    const a = getUserAgent("0xexec");
    expect(a?.name).toBe("RiskBot");
    expect(a?.taskTypes).toEqual(["wallet-risk"]);
    expect(a?.status).toBe("active");
    expect(listUserAgents()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- user-agents`
Expected: FAIL — `insertUserAgent is not a function`.

- [ ] **Step 3: Add the table to the schema**

In `packages/indexer/src/db.ts`, inside the existing `db.exec(\`...\`)` schema block, add:
```sql
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
```

- [ ] **Step 4: Add helper functions**

Append to `packages/indexer/src/db.ts`:
```ts
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
```

Note: `Date.now()` is fine here — this is runtime code, not a workflow script.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- user-agents`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/indexer/src/db.ts packages/indexer/src/__tests__/user-agents.test.ts
git commit -m "feat(indexer): add user_agents registry table + helpers"
```

---

### Task 2: Registry HTTP endpoints + signature verification

**Files:**
- Create: `packages/indexer/src/agents-api.ts` (request handlers + sig verify)
- Modify: `packages/indexer/src/index.ts` (wire routes)
- Test: `packages/indexer/src/__tests__/agents-api.test.ts`

Depends on: Task 1 (DB helpers).

- [ ] **Step 1: Write the failing test**

`packages/indexer/src/__tests__/agents-api.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createAgentMessage, handleCreateAgent } from "../agents-api.js";
import { db } from "../db.js";

const acct = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

describe("agents-api", () => {
  beforeEach(() => db.exec("DELETE FROM user_agents"));

  it("rejects a bad signature", async () => {
    const res = await handleCreateAgent({
      name: "X", systemPrompt: "p", ownerAddress: acct.address,
      payoutAddress: acct.address, taskTypes: [], bidStrategy: {},
      signature: "0xdeadbeef",
    }, { provisionExecWallet: async () => "0xexec" });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  it("accepts a valid signature and creates the agent", async () => {
    const message = createAgentMessage(acct.address, acct.address);
    const signature = await acct.signMessage({ message });
    const res = await handleCreateAgent({
      name: "RiskBot", systemPrompt: "assess risk", ownerAddress: acct.address,
      payoutAddress: acct.address, taskTypes: ["wallet-risk"], bidStrategy: { type: "balanced" },
      signature,
    }, { provisionExecWallet: async () => "0xexecAddr" });
    expect(res.ok).toBe(true);
    expect(res.execAddress).toBe("0xexecAddr");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- agents-api`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `agents-api.ts`**

```ts
import { verifyMessage } from "viem";
import { insertUserAgent, countAgentsByOwner } from "./db.js";

const MAX_AGENTS_PER_OWNER = 10;

export function createAgentMessage(ownerAddress: string, payoutAddress: string): string {
  return [
    "Hive Agent Platform — create agent",
    `owner: ${ownerAddress.toLowerCase()}`,
    `payout: ${payoutAddress.toLowerCase()}`,
    "I authorize Hive to run an autonomous worker agent and settle earnings to my payout address.",
  ].join("\n");
}

export interface CreateAgentBody {
  name: string;
  systemPrompt: string;
  ownerAddress: string;
  payoutAddress: string;
  taskTypes: string[];
  bidStrategy: Record<string, unknown>;
  signature: `0x${string}`;
}

export interface CreateAgentDeps {
  // Provisions a funded execution wallet on the runtime host; returns its public address.
  provisionExecWallet: (agent: { name: string; ownerAddress: string }) => Promise<string>;
}

export type CreateAgentResult =
  | { ok: true; execAddress: string }
  | { ok: false; status: number; error: string };

export async function handleCreateAgent(body: CreateAgentBody, deps: CreateAgentDeps): Promise<CreateAgentResult> {
  if (!body.name || !body.systemPrompt || !body.ownerAddress || !body.payoutAddress) {
    return { ok: false, status: 400, error: "missing required fields" };
  }
  if (countAgentsByOwner(body.ownerAddress) >= MAX_AGENTS_PER_OWNER) {
    return { ok: false, status: 429, error: "agent limit reached for this owner" };
  }
  const message = createAgentMessage(body.ownerAddress, body.payoutAddress);
  let valid = false;
  try {
    valid = await verifyMessage({ address: body.ownerAddress as `0x${string}`, message, signature: body.signature });
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, status: 400, error: "invalid signature" };

  const execAddress = await deps.provisionExecWallet({ name: body.name, ownerAddress: body.ownerAddress });
  insertUserAgent({
    execAddress,
    name: body.name,
    systemPrompt: body.systemPrompt,
    ownerAddress: body.ownerAddress,
    payoutAddress: body.payoutAddress,
    taskTypes: body.taskTypes,
    bidStrategy: body.bidStrategy,
    createdSig: body.signature,
  });
  return { ok: true, execAddress };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- agents-api`
Expected: PASS (both cases).

- [ ] **Step 5: Wire routes into the indexer HTTP server**

In `packages/indexer/src/index.ts`, add these branches to the request handler (after the `/content` POST branch, before the final `else`). The `provisionExecWallet` dep is provided by the runtime via a shared module (Task 3) — for the indexer process, import a thin provisioner that calls the runtime, OR (simpler for single-host deploy) the runtime and indexer share a process. Use an HTTP call to the runtime's provision endpoint:

```ts
  } else if (url === "/agents" && req.method === "GET") {
    const { listUserAgents } = await import("./db.js");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(listUserAgents().map(publicAgentFields)));
  } else if (url.startsWith("/agents/") && req.method === "GET") {
    const { getUserAgent } = await import("./db.js");
    const exec = decodeURIComponent(url.slice("/agents/".length));
    const a = getUserAgent(exec);
    if (!a) { res.statusCode = 404; res.end(JSON.stringify({ error: "not found" })); }
    else { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(publicAgentFields(a))); }
  } else if (url === "/agents" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 200_000) req.destroy(); });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body);
        const { handleCreateAgent } = await import("./agents-api.js");
        const { provisionExecWallet } = await import("./provision.js");
        const result = await handleCreateAgent(parsed, { provisionExecWallet });
        res.statusCode = result.ok ? 200 : result.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: (e as Error).message }));
      }
    });
```

Add a `publicAgentFields` helper near the top of `index.ts`:
```ts
import type { UserAgentRow } from "./db.js";
function publicAgentFields(a: UserAgentRow) {
  return {
    execAddress: a.execAddress, name: a.name, systemPrompt: a.systemPrompt,
    ownerAddress: a.ownerAddress, payoutAddress: a.payoutAddress,
    taskTypes: a.taskTypes, bidStrategy: a.bidStrategy, status: a.status, createdAt: a.createdAt,
  };
}
```

(The system prompt is intentionally public — agents are transparent by design.)

- [ ] **Step 6: Commit**

```bash
git add packages/indexer/src/agents-api.ts packages/indexer/src/index.ts packages/indexer/src/__tests__/agents-api.test.ts
git commit -m "feat(indexer): POST/GET /agents with ownership-signature verification"
```

---

### Task 3: Execution-wallet provisioning (runtime)

**Files:**
- Create: `packages/indexer/src/provision.ts` (generate + fund exec wallet)
- Test: `packages/indexer/src/__tests__/provision.test.ts`

Depends on: chain config from `@hive/shared`, faucet logic in `scripts/fund-from-faucet.ts` (reference).

- [ ] **Step 1: Write the failing test**

`packages/indexer/src/__tests__/provision.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generateExecWallet } from "../provision.js";

describe("provisioning", () => {
  it("generates a fresh exec wallet with an address and key", () => {
    const w = generateExecWallet();
    expect(w.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(w.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("generates unique wallets", () => {
    expect(generateExecWallet().address).not.toBe(generateExecWallet().address);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- provision`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `provision.ts`**

```ts
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// In-memory store of execution keys, keyed by public address. Keys live ONLY in
// this runtime process — never persisted to the DB or sent to the browser.
const execKeys = new Map<string, `0x${string}`>();

export function generateExecWallet(): { address: string; privateKey: `0x${string}` } {
  const privateKey = generatePrivateKey();
  const address = privateKeyToAccount(privateKey).address;
  return { address, privateKey };
}

export function getExecKey(address: string): `0x${string}` | undefined {
  return execKeys.get(address.toLowerCase());
}

export function rememberExecKey(address: string, privateKey: `0x${string}`): void {
  execKeys.set(address.toLowerCase(), privateKey);
}

// Called by the /agents POST handler. Generates a wallet, funds it from the
// faucet key, remembers the key in-process, and returns the public address.
export async function provisionExecWallet(_agent: { name: string; ownerAddress: string }): Promise<string> {
  const { address, privateKey } = generateExecWallet();
  rememberExecKey(address, privateKey);
  await fundExecWallet(address);
  return address;
}

// Sends a small amount of BOT from the faucet/requester key to the new exec wallet
// so it can pay gas for bids/submits.
async function fundExecWallet(address: string): Promise<void> {
  const { createWalletClient, http, parseEther } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { hiveChain, chainConfig } = await import("@hive/shared");
  const faucetKey = (process.env.FAUCET_PRIVATE_KEY ?? process.env.REQUESTER_PRIVATE_KEY) as `0x${string}` | undefined;
  if (!faucetKey) throw new Error("no FAUCET_PRIVATE_KEY / REQUESTER_PRIVATE_KEY to fund exec wallets");
  const wallet = createWalletClient({ account: privateKeyToAccount(faucetKey), chain: hiveChain, transport: http(chainConfig.rpcUrl) });
  await wallet.sendTransaction({ to: address as `0x${string}`, value: parseEther(process.env.EXEC_FUND_AMOUNT ?? "0.02") });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- provision`
Expected: PASS (generation tests; funding is not exercised in unit tests).

- [ ] **Step 5: Commit**

```bash
git add packages/indexer/src/provision.ts packages/indexer/src/__tests__/provision.test.ts
git commit -m "feat(runtime): execution-wallet generation + faucet funding + in-process key store"
```

---

### Task 4: Full agent roster in snapshot (fixes "2 agents")

**Files:**
- Modify: `packages/indexer/src/queries.ts` (union roster + live status + names)
- Test: `packages/indexer/src/__tests__/roster.test.ts`

Depends on: Task 1 (`listUserAgents`).

- [ ] **Step 1: Write the failing test**

`packages/indexer/src/__tests__/roster.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db.js";
import { buildRoster } from "../queries.js";

describe("agent roster (fixes '2 agents')", () => {
  beforeEach(() => {
    db.exec("DELETE FROM bids; DELETE FROM agents; DELETE FROM user_agents; DELETE FROM tasks");
  });

  it("includes a worker that bid but never settled a job", () => {
    db.prepare("INSERT INTO tasks (id, requester, max_bounty, status) VALUES (1,'0xreq','1000',2)").run();
    db.prepare("INSERT INTO bids (task_id, worker, price, tx_hash, block) VALUES (1,'0xbidderonly','500','0xtx',1)").run();
    // No row in `agents` (never settled) — old code would omit it.
    const roster = buildRoster();
    const addrs = roster.map((a) => a.address);
    expect(addrs).toContain("0xbidderonly");
    const bidder = roster.find((a) => a.address === "0xbidderonly")!;
    expect(bidder.completed).toBe(0);
    expect(bidder.liveStatus).toBe("bidding #1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- roster`
Expected: FAIL — `buildRoster is not a function`.

- [ ] **Step 3: Implement `buildRoster` and use it in `snapshot()`**

In `packages/indexer/src/queries.ts`, add:
```ts
import { listUserAgents } from "./db.js";

export interface RosterAgent {
  address: string;
  name: string;
  role: "user-agent" | "worker" | "requester";
  completed: number;
  timedOut: number;
  disputed: number;
  earned: string;
  reliability: number; // 0..100
  liveStatus: string;  // "idle" | "bidding #N" | "working #N"
  owner?: string;
  payout?: string;
}

// Deterministic display name from an address when the agent isn't user-named.
function generatedName(address: string): string {
  const palette = ["Amber", "Cobalt", "Jade", "Coral", "Onyx", "Slate", "Rust", "Ivory"];
  const n = Number(BigInt(address) % BigInt(palette.length));
  const suffix = address.slice(-2);
  return `Worker ${palette[n]}-${suffix}`;
}

export function buildRoster(): RosterAgent[] {
  const tasks = db.prepare("SELECT id, worker, status FROM tasks").all() as { id: number; worker: string | null; status: number }[];
  const bids = db.prepare("SELECT DISTINCT worker, task_id FROM bids").all() as { worker: string; task_id: number }[];
  const rep = db.prepare("SELECT * FROM agents").all() as { address: string; completed: number; timed_out: number; disputed: number; earned: string }[];
  const users = listUserAgents();

  const addrs = new Set<string>();
  bids.forEach((b) => addrs.add(b.worker.toLowerCase()));
  rep.forEach((r) => addrs.add(r.address.toLowerCase()));
  users.forEach((u) => addrs.add(u.execAddress.toLowerCase()));

  function liveStatus(addr: string): string {
    const working = tasks.find((t) => t.worker?.toLowerCase() === addr && (t.status === 3 || t.status === 4));
    if (working) return `working #${working.id}`;
    const biddingTask = bids.find(
      (b) => b.worker.toLowerCase() === addr && tasks.find((t) => t.id === b.task_id && t.status === 2),
    );
    if (biddingTask) return `bidding #${biddingTask.task_id}`;
    return "idle";
  }

  return [...addrs].map((addr) => {
    const r = rep.find((x) => x.address.toLowerCase() === addr);
    const u = users.find((x) => x.execAddress.toLowerCase() === addr);
    const completed = r?.completed ?? 0;
    const timedOut = r?.timed_out ?? 0;
    const disputed = r?.disputed ?? 0;
    const total = completed + timedOut + disputed;
    return {
      address: addr,
      name: u?.name ?? generatedName(addr),
      role: u ? "user-agent" : "worker",
      completed,
      timedOut,
      disputed,
      earned: r?.earned ?? "0",
      reliability: total === 0 ? 100 : Math.round((completed / total) * 100),
      liveStatus: liveStatus(addr),
      owner: u?.ownerAddress,
      payout: u?.payoutAddress,
    };
  });
}
```

Then change `snapshot()` in the same file to use it: replace the line
`const agents = db.prepare(\`SELECT * FROM agents ORDER BY completed DESC\`).all() ...`
and the `agents,` field in the returned object with:
```ts
  const agents = buildRoster().sort((a, b) => b.completed - a.completed);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- roster`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/indexer/src/queries.ts packages/indexer/src/__tests__/roster.test.ts
git commit -m "fix(indexer): full agent roster (include bidders, fixes '2 agents')"
```

---

### Task 5: Generalize the worker runtime → `runAgent`

**Files:**
- Create: `packages/agents/src/bid-strategy.ts` (strategy → price)
- Modify: `packages/agents/src/worker.ts` (accept config; keep `runWorker` as a thin wrapper)
- Modify: `packages/agents/src/execute.ts` (accept optional system prompt)
- Test: `packages/agents/src/__tests__/bid-strategy.test.ts`

Depends on: none (parallel with Tasks 1–4, different package).

- [ ] **Step 1: Write the failing test**

`packages/agents/src/__tests__/bid-strategy.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { priceForStrategy } from "../bid-strategy.js";

describe("bid strategy", () => {
  const maxBounty = 1000n;
  it("conservative bids high (closer to max)", () => {
    expect(priceForStrategy({ type: "conservative" }, maxBounty, 0n)).toBeGreaterThan(700n);
  });
  it("aggressive bids low", () => {
    expect(priceForStrategy({ type: "aggressive" }, maxBounty, 0n)).toBeLessThan(500n);
  });
  it("undercuts an existing best bid", () => {
    const p = priceForStrategy({ type: "undercut", pct: 10 }, maxBounty, 800n);
    expect(p).toBeLessThan(800n);
  });
  it("never exceeds maxBounty", () => {
    expect(priceForStrategy({ type: "conservative" }, maxBounty, 0n)).toBeLessThanOrEqual(maxBounty);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- bid-strategy`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `bid-strategy.ts`**

```ts
export type BidStrategy =
  | { type: "conservative" }
  | { type: "balanced" }
  | { type: "aggressive" }
  | { type: "undercut"; pct: number };

// Returns a bid price (wei) <= maxBounty. `best` is the current lowest bid (0n if none).
export function priceForStrategy(strategy: BidStrategy, maxBounty: bigint, best: bigint): bigint {
  const frac = (n: number, d: number) => (maxBounty * BigInt(n)) / BigInt(d);
  let price: bigint;
  switch (strategy.type) {
    case "conservative": price = frac(80, 100); break;
    case "balanced":     price = frac(60, 100); break;
    case "aggressive":   price = frac(40, 100); break;
    case "undercut": {
      const base = best > 0n ? best : maxBounty;
      price = (base * BigInt(100 - Math.min(90, Math.max(1, strategy.pct)))) / 100n;
      break;
    }
    default: price = frac(60, 100);
  }
  if (best > 0n && price >= best) price = best - 1n;
  if (price > maxBounty) price = maxBounty;
  if (price < 1n) price = 1n;
  return price;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- bid-strategy`
Expected: PASS.

- [ ] **Step 5: Generalize `worker.ts` to `runAgent`**

In `packages/agents/src/worker.ts`, add a config-driven entry point and make `runWorker` delegate to it. Add at the top:
```ts
import { priceForStrategy, type BidStrategy } from "./bid-strategy.js";

export interface AgentConfig {
  execKey: `0x${string}`;
  label: string;
  systemPrompt?: string;
  taskTypes?: string[];
  bidStrategy?: BidStrategy;
  pollMs?: number;
}
```
Rename the body of `runWorker` into `export async function runAgent(cfg: AgentConfig)`, and inside it:
- replace `const bidFactor = ...` and the `price` computation at the bid site with:
  ```ts
  const [, best] = await m.read.bestBid([id]);
  const price = priceForStrategy(cfg.bidStrategy ?? { type: "balanced" }, t.maxBounty, best);
  if (best !== 0n && price >= best) { bidding.add(id.toString()); continue; }
  ```
- in `doWork`, pass the system prompt into execute:
  ```ts
  const result = await execute(spec, cfg.systemPrompt);
  ```
- add a task-type filter right after reading the fresh task in the posted loop:
  ```ts
  if (cfg.taskTypes && cfg.taskTypes.length > 0) {
    const spec = await readSpec(t.specHash);
    if (spec && !cfg.taskTypes.includes(spec.kind)) continue;
  }
  ```
Keep a compatibility wrapper:
```ts
export async function runWorker(privateKey: `0x${string}`, label: string, pollMs = 1000) {
  return runAgent({ execKey: privateKey, label, pollMs });
}
```

- [ ] **Step 6: Make `execute` accept an optional system prompt**

In `packages/agents/src/execute.ts`, change the signature to `export async function execute(spec: Spec, systemPrompt?: string)` and, where it builds the LLM messages, prepend the system prompt if provided (use the existing default when absent). Show the edit at the message-assembly site:
```ts
const system = systemPrompt ?? DEFAULT_SYSTEM_PROMPT; // keep existing default as DEFAULT_SYSTEM_PROMPT
// ...pass `system` as the system message to the OpenAI call...
```
(If `execute.ts` has no named default, extract the current inline system string into `const DEFAULT_SYSTEM_PROMPT = "..."` first.)

- [ ] **Step 7: Run the full test suite**

Run: `pnpm test`
Expected: PASS (bid-strategy + prior tasks).

- [ ] **Step 8: Commit**

```bash
git add packages/agents/src/bid-strategy.ts packages/agents/src/worker.ts packages/agents/src/execute.ts packages/agents/src/__tests__/bid-strategy.test.ts
git commit -m "feat(agents): generalize worker into runAgent (system prompt, strategy, task-type filter)"
```

---

### Task 6: Earnings sweep

**Files:**
- Create: `packages/agents/src/sweep.ts`
- Test: `packages/agents/src/__tests__/sweep.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/agents/src/__tests__/sweep.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sweepAmount } from "../sweep.js";

describe("earnings sweep", () => {
  const reserve = 5_000_000_000_000_000n; // 0.005 gas reserve
  it("sweeps nothing below reserve", () => {
    expect(sweepAmount(reserve, reserve)).toBe(0n);
    expect(sweepAmount(reserve - 1n, reserve)).toBe(0n);
  });
  it("sweeps balance minus reserve above threshold", () => {
    const bal = reserve + 10_000_000_000_000_000n;
    expect(sweepAmount(bal, reserve)).toBe(bal - reserve);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- sweep`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `sweep.ts`**

```ts
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hiveChain, chainConfig } from "@hive/shared";

export function sweepAmount(balance: bigint, gasReserve: bigint): bigint {
  if (balance <= gasReserve) return 0n;
  return balance - gasReserve;
}

// Sweeps an exec wallet's balance (minus reserve) to the payout address on-chain.
// Returns the tx hash, or null if nothing to sweep.
export async function sweepEarnings(
  execKey: Hex,
  payoutAddress: `0x${string}`,
  balance: bigint,
  gasReserve = 5_000_000_000_000_000n,
): Promise<Hex | null> {
  const amount = sweepAmount(balance, gasReserve);
  if (amount === 0n) return null;
  const wallet = createWalletClient({
    account: privateKeyToAccount(execKey),
    chain: hiveChain,
    transport: http(chainConfig.rpcUrl),
  });
  return wallet.sendTransaction({ to: payoutAddress, value: amount });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- sweep`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/agents/src/sweep.ts packages/agents/src/__tests__/sweep.test.ts
git commit -m "feat(agents): on-chain earnings sweep to payout address"
```

---

### Task 7: Runtime — run user agents from the registry

**Files:**
- Create: `packages/agents/src/user-agent-host.ts` (poll registry, start `runAgent` per active agent, run sweep loop)
- Modify: `scripts/run-swarm.ts` (start the host alongside built-in workers)

Depends on: Tasks 3 (provision key store), 5 (runAgent), 6 (sweep). Registry read via indexer HTTP.

- [ ] **Step 1: Implement the host (no unit test — integration-verified in Task 12)**

`packages/agents/src/user-agent-host.ts`:
```ts
import { runAgent } from "./worker.js";
import { getExecKey } from "@hive/indexer/provision"; // if not exported cross-package, inline a shared key store
import { sweepEarnings } from "./sweep.js";
import { createPublicClient, http } from "viem";
import { hiveChain, chainConfig } from "@hive/shared";

const INDEXER_HTTP = process.env.HIVE_INDEXER_HTTP ?? "http://localhost:4000";
const started = new Set<string>();

// Poll the registry; start a runAgent loop for each active agent we haven't started.
export function startUserAgentHost() {
  const client = createPublicClient({ chain: hiveChain, transport: http(chainConfig.rpcUrl) });

  async function tick() {
    const res = await fetch(`${INDEXER_HTTP}/agents`).catch(() => null);
    if (!res || !res.ok) return;
    const agents = (await res.json()) as Array<{
      execAddress: string; name: string; systemPrompt: string; payoutAddress: string;
      taskTypes: string[]; bidStrategy: any; status: string;
    }>;
    for (const a of agents) {
      if (a.status !== "active" || started.has(a.execAddress)) continue;
      const key = getExecKey(a.execAddress);
      if (!key) continue; // key lives in the same process that provisioned it
      started.add(a.execAddress);
      void runAgent({ execKey: key, label: a.name, systemPrompt: a.systemPrompt, taskTypes: a.taskTypes, bidStrategy: a.bidStrategy });
      void sweepLoop(a.execAddress, key, a.payoutAddress as `0x${string}`, client);
    }
  }

  setInterval(() => void tick().catch((e) => console.error("[host] tick", e)), 3000);
}

async function sweepLoop(execAddress: string, key: `0x${string}`, payout: `0x${string}`, client: ReturnType<typeof createPublicClient>) {
  setInterval(async () => {
    try {
      const bal = await client.getBalance({ address: execAddress as `0x${string}` });
      const tx = await sweepEarnings(key, payout, bal);
      if (tx) console.log(`[host] swept ${execAddress} → ${payout}: ${tx}`);
    } catch (e) { console.error("[host] sweep", e); }
  }, 30_000);
}
```
Note: provisioning (Task 3) and the host must share one process so the in-memory `execKeys` map is reachable. If the indexer and swarm are separate pm2 processes, move `provision.ts`'s key store into a small module both import within the SAME process, OR run provisioning inside the swarm process and expose a `POST /provision` from the swarm that the indexer calls. Simplest for the single-VPS demo: run the indexer's `/agents` POST handler in the same process that runs the host (merge indexer + host into one pm2 service, or have the host BE the provisioner). Document the chosen wiring in Task 12.

- [ ] **Step 2: Start the host in the swarm**

In `scripts/run-swarm.ts`, after the worker/requester startup, add:
```ts
import { startUserAgentHost } from "@hive/agents/user-agent-host";
startUserAgentHost();
console.log("[swarm] user-agent host started");
```

- [ ] **Step 3: Typecheck + tests**

Run: `pnpm -r build && pnpm test`
Expected: build succeeds; tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/agents/src/user-agent-host.ts scripts/run-swarm.ts
git commit -m "feat(runtime): host user agents from the registry + periodic sweep"
```

---

## Phase 2 — Shared Types + Wallet Layer

### Task 8: Extend dashboard snapshot types

**Files:**
- Modify: `packages/dashboard/src/lib/types.ts`

- [ ] **Step 1: Update the `Agent` type to the roster shape**

Replace the `Agent` interface in `types.ts` with:
```ts
export interface Agent {
  address: string;
  name: string;
  role: "user-agent" | "worker" | "requester";
  completed: number;
  timedOut: number;
  disputed: number;
  earned: string;
  reliability: number;
  liveStatus: string;
  owner?: string;
  payout?: string;
}

export interface UserAgentConfig {
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
```

- [ ] **Step 2: Typecheck the dashboard**

Run: `pnpm --filter @hive/dashboard exec tsc --noEmit`
Expected: errors ONLY in components that consume the old `Agent` shape (fixed in Phase 3). If it blocks, proceed — Phase 3 tasks update those consumers.

- [ ] **Step 3: Commit**

```bash
git add packages/dashboard/src/lib/types.ts
git commit -m "feat(dashboard): roster agent + user-agent config types"
```

---

### Task 9: Wallet-connect layer (wagmi + BOT Chain 968)

**Files:**
- Create: `packages/dashboard/src/lib/wagmi.ts`
- Modify: `packages/dashboard/src/app/providers.tsx` (wrap with WagmiProvider)
- Add deps: `wagmi`, `viem` (already present), `@tanstack/react-query` (already present)

- [ ] **Step 1: Install wagmi**

Run: `pnpm --filter @hive/dashboard add wagmi`

- [ ] **Step 2: Define the chain + config**

`packages/dashboard/src/lib/wagmi.ts`:
```ts
import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const botChain = defineChain({
  id: 968,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.bohr.life"] } },
  blockExplorers: { default: { name: "botscan", url: "https://scan.bohr.life" } },
});

export const wagmiConfig = createConfig({
  chains: [botChain],
  connectors: [injected()],
  transports: { [botChain.id]: http() },
});
```

- [ ] **Step 3: Wrap providers**

In `packages/dashboard/src/app/providers.tsx`, wrap the existing tree with `WagmiProvider` (keep the existing QueryClientProvider):
```tsx
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
// ...
return (
  <WagmiProvider config={wagmiConfig}>
    {/* existing QueryClientProvider + children */}
  </WagmiProvider>
);
```

- [ ] **Step 4: Verify the app boots**

Run: `pnpm --filter @hive/dashboard build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard/src/lib/wagmi.ts packages/dashboard/src/app/providers.tsx packages/dashboard/package.json pnpm-lock.yaml
git commit -m "feat(dashboard): wagmi wallet-connect layer for BOT Chain 968"
```

---

## Phase 3 — Dashboard UI

### Task 10: Header with connect + Telegram + copy-MCP-URL + Create Agent

**Files:**
- Create: `packages/dashboard/src/components/AppHeader.tsx`
- Modify: `packages/dashboard/src/app/app/page.tsx` (use `AppHeader`)

- [ ] **Step 1: Implement `AppHeader`**

`packages/dashboard/src/components/AppHeader.tsx`:
```tsx
"use client";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useState } from "react";

const TG_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/";
const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "";

export function AppHeader({ liveBlock }: { liveBlock?: number }) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bee.png" alt="Hive" className="w-7 h-7" />
          <span className="text-lg font-semibold">Hive</span>
          {liveBlock != null && (
            <span className="ml-2 font-mono text-[11px] text-[var(--text-faint)]">
              block <span className="text-[var(--amber)]">#{liveBlock}</span>
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <a href={TG_URL} target="_blank" rel="noreferrer" className="text-xs px-2 py-1.5 rounded-sm border border-[var(--line)]">Telegram</a>
          <button
            onClick={() => { navigator.clipboard.writeText(MCP_URL); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="text-xs px-2 py-1.5 rounded-sm border border-[var(--line)]"
          >{copied ? "copied ✓" : "Add to Claude"}</button>
          <Link href="/app/create" className="text-xs px-3 py-1.5 rounded-sm bg-[var(--amber)] text-[#1a1206] font-semibold">Create Agent</Link>
          {isConnected ? (
            <button onClick={() => disconnect()} className="text-xs px-2 py-1.5 rounded-sm border border-[var(--line)] font-mono">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </button>
          ) : (
            <button onClick={() => connect({ connector: injected() })} className="text-xs px-3 py-1.5 rounded-sm border border-[var(--amber)] text-[var(--amber)]">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Use it in the dashboard**

In `packages/dashboard/src/app/app/page.tsx`, replace the existing `<header>...</header>` block with `<AppHeader liveBlock={liveBlock} />` (derive `liveBlock` in Task 12; pass `undefined` for now).

- [ ] **Step 3: Build**

Run: `pnpm --filter @hive/dashboard build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/dashboard/src/components/AppHeader.tsx packages/dashboard/src/app/app/page.tsx
git commit -m "feat(dashboard): app header with connect, Telegram, MCP-copy, create-agent"
```

---

### Task 11: Activity marquee

**Files:**
- Create: `packages/dashboard/src/components/ActivityMarquee.tsx`
- Modify: `packages/dashboard/src/app/app/page.tsx`
- Test: `packages/dashboard/src/lib/__tests__/activity.test.ts`

- [ ] **Step 1: Write the failing test for the event-derivation helper**

`packages/dashboard/src/lib/__tests__/activity.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { deriveActivity } from "../activity";
import type { Snapshot } from "../types";

const snap = {
  tasks: [
    { id: 2, status: 5, price: "500", worker: "0xw", postedUrl: "u", settledUrl: "s", bids: [{ worker: "0xw", price: "500", tx_hash: "0xt", block: 9 }] },
    { id: 1, status: 2, worker: null, bids: [], postedUrl: "p", settledUrl: null },
  ],
  agents: [], counters: {} as any, explorerBase: "https://scan.bohr.life", nativeSymbol: "BOT",
} as unknown as Snapshot;

describe("deriveActivity", () => {
  it("produces newest-first activity items with links", () => {
    const items = deriveActivity(snap, 10);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("label");
    expect(items[0]).toHaveProperty("href");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- activity`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `activity.ts`**

`packages/dashboard/src/lib/activity.ts`:
```ts
import type { Snapshot } from "./types";

export interface ActivityItem { label: string; href: string | null; kind: string; }

// Newest-first stream of real market events derived from the snapshot.
export function deriveActivity(snap: Snapshot, limit: number): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const t of snap.tasks) {
    if (t.settledUrl) items.push({ label: `Task #${t.id} settled → ${t.price} wei to ${short(t.worker)}`, href: t.settledUrl, kind: "settle" });
    for (const b of t.bids ?? []) items.push({ label: `Bid ${b.price} on #${t.id} by ${short(b.worker)}`, href: linkTx(snap, b.tx_hash), kind: "bid" });
    if (t.postedUrl) items.push({ label: `Task #${t.id} posted`, href: t.postedUrl, kind: "post" });
  }
  return items.slice(0, limit);
}

function short(a: string | null | undefined) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—"; }
function linkTx(snap: Snapshot, hash: string) { return `${snap.explorerBase}/tx/${hash}`; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- activity`
Expected: PASS.

- [ ] **Step 5: Implement the marquee component**

`packages/dashboard/src/components/ActivityMarquee.tsx`:
```tsx
"use client";
import { deriveActivity } from "@/lib/activity";
import type { Snapshot } from "@/lib/types";

export function ActivityMarquee({ snapshot }: { snapshot: Snapshot }) {
  const items = deriveActivity(snapshot, 20);
  if (items.length === 0) return null;
  return (
    <div className="group relative overflow-hidden border-y border-[var(--line)] bg-[var(--panel)]/30 py-2">
      <div className="flex gap-8 whitespace-nowrap animate-[marquee_30s_linear_infinite] group-hover:[animation-play-state:paused]">
        {[...items, ...items].map((it, i) => (
          <a key={i} href={it.href ?? undefined} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-[var(--text-dim)] hover:text-[var(--amber)]">
            {it.label}
          </a>
        ))}
      </div>
    </div>
  );
}
```
Add the keyframes to the dashboard CSS (`packages/dashboard/src/app/app/dashboard.css`):
```css
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
```

- [ ] **Step 6: Mount it in the page**

In `page.tsx`, render `{snapshot && <ActivityMarquee snapshot={snapshot} />}` directly under the header.

- [ ] **Step 7: Commit**

```bash
git add packages/dashboard/src/components/ActivityMarquee.tsx packages/dashboard/src/lib/activity.ts packages/dashboard/src/lib/__tests__/activity.test.ts packages/dashboard/src/app/app/dashboard.css packages/dashboard/src/app/app/page.tsx
git commit -m "feat(dashboard): live activity marquee from real events"
```

---

### Task 12: Agent roster panel + profile page + task timeline + live wiring + E2E

**Files:**
- Modify: `packages/dashboard/src/components/AgentPanel.tsx` (roster shape + live status + link)
- Create: `packages/dashboard/src/app/app/agents/[addr]/page.tsx` (profile)
- Create: `packages/dashboard/src/components/TaskTimeline.tsx`
- Modify: `packages/dashboard/src/components/TaskCard.tsx` (clickable → timeline modal)
- Create: `packages/dashboard/src/app/app/create/page.tsx` (create flow)
- Modify: `packages/dashboard/src/app/app/page.tsx` (liveBlock, wire everything)

- [ ] **Step 1: Update `AgentPanel` to the roster shape**

Render `agent.name`, a colored `liveStatus` dot, `reliability%`, `completed`, `earned`, and wrap each row in `<Link href={\`/app/agents/${agent.address}\`}>`. Use the new `Agent` fields from Task 8.

- [ ] **Step 2: Build the agent profile page**

`packages/dashboard/src/app/app/agents/[addr]/page.tsx` — a client component that:
- reads the live snapshot (via `useLiveSnapshot` + store) and finds the agent by `addr`,
- fetches its config from `${INDEXER_HTTP}/agents/${addr}` (404-tolerant; built-in workers have no config),
- shows identity + reputation + liveStatus,
- lists job history: filter `snapshot.tasks` where `worker === addr` OR any bid by `addr`,
- for won tasks, fetches spec + result content from `${INDEXER_HTTP}/content/${hash}` and renders them.

- [ ] **Step 3: Build `TaskTimeline`**

Vertical timeline from a `Task`: Posted (postedUrl) → each bid (BidLadder, lowest highlighted) → Awarded (worker/price) → Submitted (resultHash) → Settled (settledUrl). Each step links to its tx. Fetch spec/result content for display.

- [ ] **Step 4: Make `TaskCard` open the timeline**

Add click handling to open `TaskTimeline` in a modal (local `useState`), and a live block-based countdown for bidding/deadline.

- [ ] **Step 5: Build the create-agent flow**

`packages/dashboard/src/app/app/create/page.tsx` — steps: connect wallet → form (name, system prompt, task-types multiselect, strategy preset) → `signMessage` (wagmi `useSignMessage`, message from a shared helper mirroring `createAgentMessage`) → `POST ${INDEXER_HTTP}/agents` → success screen linking to `/app/agents/[execAddress]`.

Add a shared message helper `packages/dashboard/src/lib/agent-message.ts` identical to server `createAgentMessage` so the signed message matches exactly.

- [ ] **Step 6: Live block ticker**

In `page.tsx`, add a `useEffect` that reads `NEXT_PUBLIC_RPC_URL` block number every 2s (viem public client) into `liveBlock` state, passed to `AppHeader`. Ambient motion, real data.

- [ ] **Step 7: Build + typecheck the whole dashboard**

Run: `pnpm --filter @hive/dashboard build`
Expected: succeeds, no type errors.

- [ ] **Step 8: Full suite**

Run: `pnpm test`
Expected: all PASS.

- [ ] **Step 9: End-to-end on BOT Chain 968 (the real acceptance test)**

Wiring decision (from Task 7): run provisioning + user-agent host in the SAME process as the `/agents` POST handler. Simplest: merge the host into the indexer service, or run one combined pm2 service. Document the choice in `docs/DEPLOY.md`.

Then, on the VPS:
```bash
git pull && pnpm install && pnpm -r build
pm2 restart hive-indexer hive-swarm hive-mcp --update-env
```
Manual E2E:
1. Open `/app`, Connect Wallet, Create Agent (name + prompt + strategy), sign.
2. Confirm the agent appears in the roster with liveStatus.
3. Post a task (dashboard "Post task" or swarm requester).
4. Watch the agent bid → win → submit → settle in the live terminal + marquee.
5. Open the agent profile: see job history + the actual result content.
6. Confirm the payout sweep tx on `scan.bohr.life`.

- [ ] **Step 10: Commit**

```bash
git add packages/dashboard/src
git commit -m "feat(dashboard): roster panel, agent profiles, task timeline, create flow, live block ticker"
```

---

## Self-Review Notes (addressed)

- **Spec §5.1 registry** → Tasks 1–2. **§5.2 roster fix** → Task 4. **§5.3 live status** → Task 4 (`liveStatus`). **§5.4 runAgent** → Task 5. **§5.5 sweep** → Task 6. **§4 wallet model** → Tasks 3 (exec wallet), 9 (connect), 12 (sign). **§5.6 terminal** → Tasks 10–12. **§5.7 profile** → Task 12. **§5.8 create** → Task 12. **§5.9 wallet layer** → Task 9. **§7 edge cases** → covered in Tasks 2 (sig/limit), 4 (0-win visible), 3 (funding).
- **Type consistency:** `RosterAgent` (indexer) ↔ `Agent` (dashboard) share field names (address, name, role, completed, timedOut, disputed, earned, reliability, liveStatus, owner, payout). `createAgentMessage` is duplicated intentionally on server + client (Task 12 Step 5) and MUST stay byte-identical.
- **Known cross-process risk (documented, not hidden):** the exec-key store (Task 3) is in-memory, so provisioning and the host must share one process (Task 7 note, Task 12 Step 9). This is the single most important wiring decision — do not skip it.
- **No test runner existed** → Task 0 adds Vitest before any TDD task.
