# Hive — Build Plan

Execution plan for scaffolding and building the Hive on-chain AI-agent labor market.
Companion to `HIVE-BotChain-PRD.md` and `HIVE-BotChain-TRD.md`.

> Track: AI Agent · Chain: BOT Chain testnet
> Judging weights driving priority: BOT Chain Integration 35% · Product Completeness 25% · Innovation 20% · Presentation 20%

---

## Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Backend language | **TypeScript everywhere** (viem) | One toolchain, shared types/ABIs with the frontend, no context-switching |
| Contracts toolchain | **Foundry** | Native fuzz tests for the INV-1..INV-6 invariants |
| Repo shape | **pnpm monorepo** (workspaces) | One install, shared `shared` package, matches TRD layout |
| Data strategy | **Real code against local Anvil first** → BOT Chain testnet once M0 passes | No fakes; one env swap to go live |

## Tooling status (checked)

| Tool | Status |
|---|---|
| Node | ✅ v22.17.1 |
| pnpm | ✅ 10.15.1 |
| git | ✅ 2.50.1 |
| **Foundry (`forge`, `anvil`)** | ❌ **not installed — required for contracts + local node** |

**Action:** install Foundry before Phase 2. On Windows the reliable path is `foundryup` via Git Bash, or run it inside WSL. If Foundry install stalls, the fallback is **Hardhat** (npm-based, no extra system install) — noted per-phase below.

---

## Repository layout (target)

```
hive/
  packages/
    contracts/     # Foundry — HiveMarket.sol, Reputation.sol, tests, deploy script
    shared/        # TS: chain config, generated ABIs, event + task types (single source of truth)
    agents/        # requester + worker runtime (viem), policy, verifier, execute()
    indexer/       # viem event listener → SQLite projection → small API/WS
    dashboard/     # Next.js + Tailwind + Zustand + TanStack Query
  scripts/         # fund-from-faucet, deploy, seed-tasks, run-swarm
  docs/            # PRD, TRD, this plan, write-up
  pnpm-workspace.yaml
  package.json     # root: workspace scripts
  .env.example
  README.md
```

**Dependency direction (one-way, no cycles):**
`contracts` → (generates ABIs into) `shared` → imported by `agents`, `indexer`, `dashboard`.
`dashboard` reads only from `indexer`'s API. `agents` + `indexer` talk to the chain via the same RPC.

---

## Build phases

Each phase ends with a concrete, checkable artifact. Built in order; no pause between phases unless a tool is missing.

### Phase 0 — Workspace root
- `pnpm-workspace.yaml`, root `package.json` with workspace scripts, `.gitignore`, `.env.example`, `README` skeleton.
- Move `HIVE-BotChain-PRD.md` + `HIVE-BotChain-TRD.md` into `docs/`.
- **Done when:** `pnpm install` runs clean at root.

### Phase 1 — `shared`
- Chain config loader (RPC, chain id, explorer base — read from `.env`, no hard-coded BOT Chain guesses).
- `Task`/`Agent`/`Status` types, event type definitions matching TRD §4.3.
- Placeholder for generated ABIs (filled by Phase 2).
- **Done when:** package builds and exports types.

### Phase 2 — `contracts` (Foundry)
- `HiveMarket.sol` (post/bid/award/submit/accept/reject/timeoutSettle) + `Reputation.sol`, per TRD §4.
- State machine + events exactly as specified. `ReentrancyGuard`, checks-effects-interactions.
- Foundry tests for INV-1..INV-6 + full lifecycle + failure paths (TRD §12).
- Deploy script; ABI export step writes ABIs into `shared`.
- **Done when:** `forge test` green; ABIs land in `shared`. *(Fallback: Hardhat if Foundry unavailable.)*

### Phase 3 — `agents`
- One process type, parameterized requester|worker (TRD §5).
- Worker loop (watch → bid → award → execute real LLM work → submit).
- Requester loop (post+fund → verify → accept/reject). v1 verifier = heuristic + optional LLM grade, clearly scoped.
- Event handling via `getLogs` polling (safe default), nonce mgmt + retry.
- **Done when:** against local Anvil, 1 requester + 1 worker complete one real task end-to-end.

### Phase 4 — `indexer`
- Poll all events from deploy block → SQLite projection (tasks by status, per-agent stats, running totals + gas).
- Small API/WS the dashboard reads. Every record carries its `txHash`.
- **Done when:** projection reflects Phase 3's live task; API returns it.

### Phase 5 — `dashboard` (Next.js + Tailwind + Zustand + TanStack Query)
- Structure only for now (design reference comes later): live task feed, agent panel, "alive" counters, explorer deep-links, "post a task" control.
- TanStack Query against the indexer API; Zustand for live UI state.
- **Done when:** runs, renders the indexer's data, links resolve. Visuals plain until design lands.

### Phase 6 — `scripts` + wiring
- `deploy`, `fund-from-faucet`, `seed-tasks` (real specs), `run-swarm`, demo-mode concurrency ramp.
- README quickstart: clone → deploy → run swarm → open dashboard.
- **Done when:** one command brings the local loop up end-to-end.

### Phase 7 — go live on BOT Chain testnet (M0 gate) — BLOCKED on config
- Look up real RPC / chain id / explorer / faucet (dev-docs.botchain.ai, do **not** guess).
- **Status:** dev-docs.botchain.ai + www.botchain.ai return **HTTP 403** to automated
  fetch (logged as Bounty Finding 1 in `docs/findings.md`). The four chain values +
  one funded key must be supplied by the human from a browser.
- Once supplied: swap the four values in `.env`, `pnpm deploy:local` (same script
  targets whatever RPC `.env` names), then `pnpm faucet` / `pnpm swarm` / dashboard.
- **Done when:** a real tx is verifiable on the BOT Chain explorer. *This is the 35% proof.*

---

## Status (2026-07-04)

Phases 0–6 **complete and verified end-to-end on local Anvil**:
- Contracts: 16/16 tests pass; deploys cleanly.
- Agents: full post→bid→award→execute→submit→settle loop settles on-chain.
- Indexer: projects the lifecycle + on-chain reputation; serves snapshot + WebSocket.
- Dashboard: live, renders real on-chain data, explorer deep-links, "post a task" works.
- Scripts + README: one-command local bring-up, verified with 3 tasks all settling.

Phase 7 (testnet cutover) is the only remaining step and is blocked purely on the
BOT Chain testnet config (403 to automated fetch). No code change needed — it's an
`.env` swap once the values are in hand.

---

## Guardrails

- **No over-engineering.** Minimal single-purpose files. No speculative abstraction.
- **Comments only for the non-obvious** (keeper calls, invariants, why-not-what). No JSDoc walls.
- **No fakes.** Anything shown as on-chain is a real tx (integrity rule + the 35%).
- **`.env`-driven chain config.** One swap moves Anvil → testnet; nothing chain-specific hard-coded.

## Order of value if time compresses

M0 (Phase 7 gate) + a thin vertical slice (1 requester, 1 worker, 1 real task, on testnet, on the explorer) outscores a broad half-built system. Depth of chain integration first, breadth second.
