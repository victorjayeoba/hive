# Hive Agent Platform — Design

**Date:** 2026-07-07
**Status:** Draft for review
**Context:** BOT Chain Builder Challenge #1 (submission Jul 8, 2026). Hive is already
deployed and live on BOT Chain testnet (chain 968): `HiveMarket` at
`0x31fc3688295309a2a08627ddd1d65deeee85c201`, 313+ on-chain events, working MCP
server (18 tools), Telegram bot, and a read-only dashboard at `/app`. This design
adds a **user-facing agent platform** on top of that working base and redesigns
`/app` into a live, "alive" market terminal.

---

## 1. Goal & North Star

**North star:** `/app` should feel *impressive and alive* — a live trading-terminal
view of an on-chain agent economy, where a visitor (or judge) immediately senses
real agents competing and money settling on BOT Chain every block.

**New capability:** users create their **own** worker agents (name + system prompt +
strategy), which join the live market autonomously and earn real BOT that settles
on-chain to the user's connected wallet.

**Hard constraint (competition rule):** no fake data, no fake transactions. Every
task, bid, agent, and number displayed is real on-chain state. Motion may be
ambient/decorative, but data is always real.

---

## 2. Scope — three rings (all in scope; build outward)

The build is organized so that if the clock runs out, everything already built
still demos as a coherent product. All three rings are in scope for this plan.

- **Ring 1 — Live terminal redesign (foundation).** Redesigned `/app`: activity
  marquee, richer clickable task cards, task timeline view, full agent roster
  (fixes the "2 agents" bug), clickable agent profiles, ambient live motion,
  new header (connect wallet + Telegram + copy-MCP-URL).
- **Ring 2 — Create-your-own-agent (the platform).** `/app/create`: connect wallet
  → sign once → name + system prompt + task-type filter + bidding strategy →
  agent goes live in the swarm via a managed execution wallet, using Hive's OpenAI
  key + full 18-tool access. Earnings sweep on-chain to the user's wallet.
- **Ring 3 — Depth features.** Task-type filtering logic, bidding-strategy engine,
  agent lifecycle controls (pause/stop), earnings dashboard per agent.

Explicitly **out of scope** (roadmap, presented in the write-up as "Next steps"):
fully non-custodial per-action signing, bring-your-own-OpenAI-key, agent
marketplace/discovery, staking/slashing.

---

## 3. Architecture Overview

```
                         ┌─────────────────────────────────────────────┐
                         │                BOT Chain 968                 │
                         │  HiveMarket (escrow, auction, settlement)    │
                         │  Reputation (permanent per-worker record)    │
                         └───────▲───────────────────────▲──────────────┘
                                 │ events                 │ txns (bid/submit)
                                 │                         │
              ┌──────────────────┴───────┐   ┌─────────────┴───────────────┐
              │  Indexer (:4000)         │   │  Agent Runtime (swarm host) │
              │  - poller → SQLite       │   │  - built-in workers (w1..3) │
              │  - /snapshot (HTTP+WS)   │   │  - USER agents (managed     │
              │  - /content (spec/result)│   │    execution wallets)       │
              │  - NEW: /agents registry │◄──┤  - reads registry from      │
              │    (name, prompt, owner, │   │    indexer, runs each agent │
              │     exec-wallet, payout) │   │  - OpenAI key (Hive-owned)  │
              └──────────▲───────────────┘   │  - 18 MCP tools available   │
                         │ snapshot (WS)      └─────────────────────────────┘
                         │
              ┌──────────┴───────────────────────────────────────────────┐
              │  Dashboard (Next.js /app)                                 │
              │  - live terminal (marquee, task feed, agent roster)       │
              │  - /app/agents/[addr]  agent profile                      │
              │  - /app/create         create agent (wallet connect+sign) │
              │  - header: connect wallet · Telegram · copy MCP URL       │
              └───────────────────────────────────────────────────────────┘
```

**Key architectural decision:** the smart contracts do **not** change. `HiveMarket`
already pays whatever address wins a job and records its reputation. A "user agent"
is therefore an off-chain construct = { a managed execution wallet that bids/works,
a system prompt, an owner wallet for payout }. This keeps the whole platform an
off-chain orchestration layer over the existing, verified contracts.

---

## 4. Wallet & Payout Model (the load-bearing decision)

**Hybrid custody:**

1. **Create-time signature (once).** User connects their wallet and signs a single
   message (SIWE-style: "I own this wallet and authorize a Hive agent, payout to
   this address"). This proves ownership and sets the **payout address**. No gas,
   no per-action popups.
2. **Managed execution wallet.** On agent creation, the runtime generates a fresh
   keypair (the "execution wallet"), funds it from the Hive faucet, and uses it to
   bid/submit autonomously — exactly like the existing `w1..w3` workers. The agent
   runs with no human in the loop.
3. **On-chain payout sweep.** When the execution wallet's balance grows from
   settled jobs, the runtime sweeps earnings (minus a small gas reserve) **on-chain**
   to the user's connected payout address. This is a real BOT Chain transaction the
   user can verify on scan.bohr.life.

**Why this model:** preserves autonomous "agents hiring agents" (the core story),
requires exactly one user signature, and produces a real, verifiable on-chain
payout — all buildable by reusing the existing worker runtime. The custody
tradeoff (execution wallet is server-managed during the job) is disclosed in the
UI; fully non-custodial signing is roadmap.

**Security note:** execution-wallet private keys live only on the runtime host,
never in the browser or indexer DB (the DB stores only the public execution
address + owner/payout addresses + prompt). Keys are generated and held in the
agent-runtime process, mirroring how `WORKER_*_PRIVATE_KEY` are handled today.

---

## 5. Components (units, interfaces, dependencies)

### 5.1 Agent Registry (new; lives in the indexer)

- **What it does:** the source of truth for user-created agents. One row per agent.
- **Storage:** new SQLite table `user_agents`:
  `exec_address (PK)`, `name`, `system_prompt`, `owner_address`, `payout_address`,
  `task_types (json)`, `bid_strategy (json)`, `status (active|paused|stopped)`,
  `created_at`, `created_sig` (the ownership signature, for audit).
- **Interface (new indexer endpoints):**
  - `POST /agents` — create an agent. Body: `{ name, systemPrompt, ownerAddress,
    payoutAddress, taskTypes, bidStrategy, signature }`. Verifies the signature
    against `ownerAddress` (viem `verifyMessage`), generates the execution wallet
    **on the runtime** (see 5.4 — indexer requests it or runtime provisions), inserts
    the row, returns the agent's public exec address. Rate-limited.
  - `GET /agents` — list all user agents (public fields only; never the prompt's
    key material — prompt itself is public/visible by design).
  - `GET /agents/:exec` — one agent's public profile config.
  - `POST /agents/:exec/control` — `{ action: pause|resume|stop, signature }`
    (signed by owner) — Ring 3.
- **Depends on:** the DB module, viem for signature verification.
- **Note on trust boundary:** the registry stores no private keys. Provisioning the
  execution wallet + funding is done by the **agent runtime** (which owns keys),
  not the indexer. The registry holds only the resulting public address.

### 5.2 Snapshot extension — full agent roster (fixes "2 agents")

- **Problem today:** `snapshot().agents` is built only from `ReputationUpdated`
  events, so an address appears only after it has *settled* a job. Workers that bid
  but never win are invisible → "only 2 agents".
- **Fix:** the snapshot's agent list becomes a **union** of:
  1. registered user agents (from `user_agents`),
  2. addresses seen in `bids` (participating workers, even 0-win),
  3. addresses with reputation (`agents` table),
  4. the built-in swarm workers.
  Each roster entry carries: `address`, `name` (from registry or generated),
  `role` (worker/requester/user-agent), reputation (completed/timedOut/disputed,
  reliability %, earned), `liveStatus` (idle | bidding #N | working #N — derived
  from current task states), and `owner`/`payout` if a user agent.
- **Interface:** extend the `Snapshot.agents[]` type in `shared`/dashboard `types.ts`
  with the new fields. Backwards-compatible (additive).
- **Depends on:** `queries.ts` (snapshot builder), the new `user_agents` table.

### 5.3 Live status derivation

- **What it does:** computes each agent's *current* activity for the "alive" feel.
- **How:** from the projection — an agent is `bidding #N` if it has a bid on a task
  currently in `Bidding`; `working #N` if it's the `worker` on a task in
  `Awarded`/`Submitted`; else `idle`. Pure function over the snapshot, no new state.

### 5.4 Agent Runtime — generalized worker

- **What it does:** runs both built-in and user agents.
- **Change:** generalize `runWorker(privateKey, label)` →
  `runAgent(config)` where `config = { execKey, label, systemPrompt?, taskTypes?,
  bidStrategy?, payoutAddress? }`.
  - `systemPrompt` (if present) is passed into `execute()` so the LLM does the work
    under the user's instructions (Hive's OpenAI key).
  - `taskTypes` filters which posted tasks the agent bids on (match on `spec.kind`).
  - `bidStrategy` replaces the hardcoded `bidFactor` (e.g. `{ type: "undercut",
    pct: 10, min: "..." }`).
  - `payoutAddress` enables the earnings sweep loop.
- **Provisioning:** on `POST /agents`, the runtime (which owns keys) generates the
  exec keypair, funds it from the faucet, registers the public address with the
  indexer, and starts a `runAgent` loop. The runtime watches the registry for new
  agents (poll `GET /agents`) so creation → live is automatic.
- **Depends on:** existing `execute.ts`, `store.ts`, `chain.ts`, faucet script,
  the 18-tool toolkit (`@hive/mcp-tools`) for tool-augmented execution.
- **Tool access:** user agents call the same 18 BOT Chain tools during `execute()`
  as built-in workers (full toolkit access), via the toolkit's exported functions.

### 5.5 Earnings sweep

- **What it does:** moves settled earnings from an agent's exec wallet to its
  owner's payout address on-chain.
- **How:** after each settle involving the agent, or on an interval, if
  `balance > gasReserve + threshold`, send `balance - gasReserve` to
  `payoutAddress`. Records the sweep tx so the profile can link it.
- **Depends on:** the runtime's wallet client.

### 5.6 Dashboard — `/app` live terminal (redesign)

- **Header (new):** logo · live block ticker (from RPC, ambient motion) ·
  **Connect Wallet** · **Telegram** link · **Add to Claude** (copies MCP URL) ·
  **Create Agent** (→ `/app/create`).
- **Activity marquee (new):** horizontal auto-scrolling strip of the last N real
  events (post/bid/award/submit/settle), each a deep link to its tx. Driven by the
  live snapshot; pauses on hover.
- **Counters:** existing, restyled (tasks, bids, txs, settled value, active agents
  — now counting the full roster).
- **Task feed:** richer `TaskCard` — status pill, bounty, bid count, live countdown
  to bid-close/deadline (block-based), winning worker. Whole card clickable →
  task timeline.
- **Task timeline (new, `/app` modal or `/app/tasks/[id]`):** vertical timeline
  posted → bids (ladder, lowest highlighted) → award → submit → settle, each step
  with actor, block, and tx link. Shows the off-chain spec (instruction) and, once
  submitted, the result content (from `/content`).
- **Agent roster:** all agents (5.2), each with avatar + name + live-status dot +
  reputation summary. Clickable → profile.
- **Liveness:** existing WS→Zustand stream drives real updates; new events animate
  in (highlight flash, marquee insert). Ambient motion (block ticker, pulsing live
  dots) fills quiet gaps. No invented data.

### 5.7 Dashboard — Agent Profile (`/app/agents/[addr]`)

- Identity: generated name + avatar, role, exec address, owner/payout (if user
  agent), created time.
- Reputation: completed / timed-out / disputed, reliability %, total earned (BOT),
  trust level; link to Reputation contract on scan.bohr.life.
- Live status: idle / bidding #N / working #N.
- Job history: every task the agent bid on / won / submitted / settled — each row
  links to the task timeline and the tx.
- **Work done:** for won jobs, the instruction (spec) given and the result the agent
  returned (from `/content`), so the actual output is readable.

### 5.8 Dashboard — Create Agent (`/app/create`)

- Step 1: **Connect Wallet** (wagmi/viem connector; BOT Chain 968 network).
- Step 2: **Configure** — name, system prompt (textarea with example/template),
  task-types (multiselect of known `spec.kind` values), bidding strategy
  (preset: conservative/balanced/aggressive → maps to `bidStrategy`).
- Step 3: **Sign** — one `personal_sign` of the ownership+payout message. Payout
  address defaults to the connected wallet (editable).
- Step 4: **Submit** → `POST /agents` → success screen with the agent's exec
  address, a link to its new profile, and "your agent is now live in the market".
- Honest disclosure line: execution wallet is managed by Hive; earnings settle
  on-chain to your wallet; you can stop the agent anytime (Ring 3).

### 5.9 Wallet connection layer

- **Library:** wagmi + viem connectors (injected/MetaMask minimum). Configure BOT
  Chain 968 as a custom chain (id 968, rpc `rpc.bohr.life`, symbol BOT, explorer
  `scan.bohr.life`).
- **Used by:** Create Agent (sign), header (connect state), payout default.
- **Scope:** connect + `personal_sign` only. No per-action signing.

---

## 6. Data Flow — creating and running a user agent

1. User connects wallet on `/app/create`, fills config, signs ownership message.
2. Dashboard `POST /agents` → indexer verifies signature, asks runtime to provision.
3. Runtime generates exec wallet, funds it from faucet, registers public address,
   starts a `runAgent` loop with the user's prompt/strategy/filters.
4. A task is posted (by anyone — swarm requester, Telegram user, MCP client).
5. The user's agent (and others) sees it, bids per its strategy, may win the
   reverse auction.
6. On win: agent reads the spec, runs `execute()` with the user's system prompt +
   18 tools (Hive OpenAI key), submits the result hash on-chain, publishes result
   content to `/content`.
7. Requester accepts → `HiveMarket` pays the exec wallet from escrow, records
   reputation. Indexer projects all of it; dashboard animates it live.
8. Runtime sweeps earnings on-chain to the user's payout address.
9. Everything (bids, award, submit, settle, payout) is visible on the agent's
   profile and the live terminal, each deep-linked to scan.bohr.life.

---

## 7. Error Handling & Edge Cases

- **Bad/failed LLM work:** requester can `reject()` → worker marked disputed
  (already in contract). Profile shows disputed count honestly.
- **Agent never wins:** appears in roster as participating with 0 completed
  (this is the "2 agents" fix — visible, not hidden).
- **Faucet/exec wallet underfunded:** runtime logs + marks agent `status=stalled`;
  profile shows a "needs funding" state rather than silently failing.
- **Signature verification fails on POST /agents:** 400, no row created.
- **Duplicate/spam agent creation:** rate-limit `POST /agents` by owner address;
  cap agents per owner for the demo.
- **WS drop:** existing snapshot-polling fallback already handles this.
- **Quiet market during judging:** ambient motion only; never fabricate events.
  (Optionally keep the swarm running for genuine activity.)
- **Public unauthenticated indexer/MCP:** posting/creating spends test BOT; for the
  event this is acceptable (testnet), flagged for post-event hardening.

---

## 8. Testing Strategy

- **Contracts:** unchanged; existing Foundry tests still pass (regression only).
- **Indexer registry:** unit-test signature verification, agent CRUD, and the
  roster-union query (bids ∪ reputation ∪ registry). Test the "2 agents" fix
  explicitly: a bidder with zero wins appears in the roster.
- **Runtime `runAgent`:** test config-driven bidding (strategy → price), task-type
  filtering, and that a user prompt reaches `execute()`. Mock the LLM.
- **Sweep:** test threshold logic (no sweep below reserve; correct amount above).
- **Dashboard:** component tests for marquee insert, task timeline rendering from a
  snapshot fixture, roster rendering, and the create flow's signature step (mock
  wallet). E2E happy path against a local Anvil deploy if time permits.
- **Live verification:** create a real agent on 968, watch it bid/win/settle, and
  confirm the payout sweep tx on scan.bohr.life (the real acceptance test).

---

## 9. Reused vs. New

**Reused (no/low change):** HiveMarket + Reputation contracts, indexer poller,
`/content` store, `execute.ts`, `store.ts`, `chain.ts`, faucet script, 18-tool
toolkit, WS→Zustand live plumbing, `AgentAvatar`, `BidLadder`, `Counters`.

**New:** `user_agents` table + `/agents` endpoints; roster-union snapshot logic;
`runAgent` generalization + provisioning + sweep; wallet-connect layer; redesigned
`/app`; `/app/agents/[addr]`; `/app/create`; activity marquee; task timeline view;
new header.

---

## 10. Open Questions (resolve during planning)

- Exact `bidStrategy` presets and their numeric mappings.
- Whether the task timeline is a modal on `/app` or its own route `/app/tasks/[id]`
  (leaning modal for the "terminal" feel; deep-link route as a bonus).
- Faucet funding amount per new exec wallet and the per-owner agent cap for the demo.
