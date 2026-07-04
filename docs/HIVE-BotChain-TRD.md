# Hive — Technical Requirements Document (TRD)

**Engineering spec for the on-chain AI-agent labor market on BOT Chain.**

> Companion to `HIVE-BotChain-PRD.md`. This is the build spec: contract interfaces, state machine, agent runtime, event schema, deployment + verification pipeline.
> Track: AI Agent · Chain: BOT Chain testnet · Deadline: Jul 8, 2026, 23:59 UTC+8

---

## 0. How this document maps to the judging criteria

Every section is tagged with the judging dimension it feeds. Build in this priority order — it's the score order.

| Dimension | Weight | Where this TRD delivers it |
|---|---|---|
| **BOT Chain Integration** | **35%** | §2 chain config, §4 contracts (on-chain escrow/auction/reputation), §7 per-block settlement, §11 verification-on-scan. The core loop *requires* the chain. |
| **Product Completeness** | **25%** | §5 agent runtime (real LLM work), §6 indexer, §8 dashboard, §12 test plan, §13 run/deploy scripts. A judge can clone and run it. |
| **Innovation** | **20%** | §3 the reverse-auction + on-chain reputation labor market — a design, not a fork. §14 extension surface ("room to grow"). |
| **Presentation** | **20%** | §8 dashboard (explorer-linked, live counters), §10 demo instrumentation, §13 README/write-up outputs. |

**Design rule that protects all four:** anything the UI shows as on-chain MUST be a real, verifiable tx on scan.botchain.ai. This is both the integrity requirement (rules disqualify fake txs) and the thing that earns the 35%.

---

## 1. System overview

Three deployable units, one shared contract layer:

```
Contracts (Solidity)  ──emits events──►  Indexer  ──►  Dashboard (web)
      ▲                                                     │ "post task"
      │ tx (post/bid/award/submit/settle)                   ▼
   Agent runtime (requester + N workers, each a funded wallet + policy + real LLM)
```

- **Contracts** hold all authoritative state and money. Nothing is "trusted off-chain."
- **Agent runtime** is stateless-restartable; wallets + on-chain state are the source of truth.
- **Indexer + dashboard** are pure read-side; they never hold authority, only visualize.

---

## 2. BOT Chain integration [35%]

### 2.1 Network config — LOOK UP AT BUILD TIME, DO NOT GUESS
Populate `.env` from official sources before writing any tx code:

| Key | Source | Notes |
|---|---|---|
| `RPC_URL` | dev-docs.botchain.ai → RPC/Network Config | primary; add a fallback if a 2nd is published |
| `CHAIN_ID` | dev-docs | used in tx signing + wallet add |
| `NATIVE_SYMBOL` | dev-docs | expect `BOT` |
| `EXPLORER_BASE` | scan.botchain.ai | build tx/address deep-links from this |
| `FAUCET_URL` | faucet.botchain.ai/basic | fund every agent wallet from here |
| `BLOCK_TIME_MS` | docs (≈750) | used only for UI pacing/labels |

**M0 gate (do this first, before anything else):** add the network to a wallet, fund one key from the faucet, deploy a trivial contract, and confirm it appears + is verifiable on scan. If M0 doesn't pass, nothing else matters. Capture the address + tx hash as proof the pipeline works.

### 2.2 Tooling
- **Contracts:** Foundry (preferred — fast fuzz tests) or Hardhat. Deploy script targets `RPC_URL` + `CHAIN_ID`.
- **Verification:** verify source on scan.botchain.ai if a verify endpoint/API is exposed; if not, this becomes a **Bounty submission** (doc/feature gap — see §15). Either way, publish the flattened source in the repo.
- **Gas:** near-zero — but still set sane gas limits; log actual fee per tx to surface the "$0.00X" story in the demo.

### 2.3 Why this is "native," not "RPC-swapped" (say this in the write-up)
The protocol writes to chain on **every** lifecycle step (post, each bid, award, submit, settle, reputation update). On a mainnet-gas chain this is economically impossible; on a multi-second chain the live auction doesn't clear in time. Hive's mechanism is *co-designed* with BOT Chain's fee + block-time profile. That is the definition of deep integration.

---

## 3. Innovation core: the mechanism [20%]

The novel unit is a **continuously-clearing reverse-auction labor market with on-chain reputation**, not a generic escrow.

- **Reverse (Dutch-ish) auction:** requester posts a max bounty; workers submit descending bids within a short window (a few blocks). Lowest valid bid wins; tie-break by reputation then first-seen. This is price discovery for agent labor, on-chain, in seconds.
- **On-chain reputation as a first-class primitive:** completions, timeouts, and disputes are cheap on-chain counters (viable only because writes are near-free). Reputation feeds tie-breaks and worker bidding policy — a feedback loop that lives entirely on-chain.
- **Composability hook (room to grow):** the `Reputation` contract is readable by any other contract → a future primitive other BOT Chain apps can build on. Note this explicitly; it's the "ecosystem infrastructure" angle judges reward.

---

## 4. Smart contract specification [35% + 25%]

Three contracts, minimal and auditable. Prefer one clear `HiveMarket` facade that composes `Reputation`, or three small contracts — your call; keep each unit single-purpose and independently testable (per the PRD's isolation principle).

### 4.1 Data model

```solidity
enum Status { None, Posted, Bidding, Awarded, Submitted, Settled, Refunded }

struct Task {
    uint256 id;
    address requester;
    bytes32 specHash;     // hash of the task spec/prompt (spec stored off-chain/IPFS/URL)
    bytes32 inputHash;    // hash of the input payload
    uint256 maxBounty;    // escrowed amount (native BOT), upper bound on price
    uint64  bidCloseBlock;// bidding ends at this block
    uint64  deadlineBlock;// work must be submitted by this block
    address worker;       // winning worker (0x0 until awarded)
    uint256 price;        // winning bid (<= maxBounty)
    bytes32 resultHash;   // submitted result hash (0x0 until submitted)
    Status  status;
}

struct Agent {          // reputation record
    uint64 completed;
    uint64 timedOut;
    uint64 disputed;
    uint64 lastActiveBlock;
}
```

### 4.2 External interface

```solidity
// --- Requester side ---
function postTask(bytes32 specHash, bytes32 inputHash, uint64 bidWindowBlocks, uint64 workWindowBlocks)
    external payable returns (uint256 taskId);   // msg.value = maxBounty, escrowed
    // emits TaskPosted

function accept(uint256 taskId) external;         // requester confirms result OK
    // pays worker `price`, refunds surplus (maxBounty - price) to requester,
    // reputation.completed++, emits Settled

function reject(uint256 taskId) external;          // requester rejects within window
    // refunds requester, reputation.disputed++ for worker, emits Refunded

// --- Worker side ---
function bid(uint256 taskId, uint256 price) external;  // price <= maxBounty and <= current best
    // records/updates best bid, emits BidPlaced

function award(uint256 taskId) external;               // callable after bidCloseBlock
    // sets worker=best bidder, price=best bid, status=Awarded, emits Awarded
    // (permissionless keeper-style call; anyone can trigger; idempotent)

function submit(uint256 taskId, bytes32 resultHash) external; // only winning worker, before deadline
    // status=Submitted, emits Submitted

// --- Anyone (keeper) ---
function timeoutSettle(uint256 taskId) external;  // after deadline w/ no submission → refund requester,
    // worker.timedOut++, emits Refunded
function autoRelease(uint256 taskId) external;    // OPTIONAL v1: if requester doesn't act within grace,
    // and a heuristic pre-passed, release to worker (documented as v1 verifier)

// --- Views ---
function getTask(uint256) external view returns (Task memory);
function getAgent(address) external view returns (Agent memory);
function bestBid(uint256) external view returns (address worker, uint256 price);
```

### 4.3 Events (the indexer/dashboard contract — keep stable)

```solidity
event TaskPosted(uint256 indexed id, address indexed requester, uint256 maxBounty, uint64 bidCloseBlock, uint64 deadlineBlock, bytes32 specHash);
event BidPlaced(uint256 indexed id, address indexed worker, uint256 price);
event Awarded(uint256 indexed id, address indexed worker, uint256 price);
event Submitted(uint256 indexed id, address indexed worker, bytes32 resultHash);
event Settled(uint256 indexed id, address indexed worker, uint256 paid, uint256 refunded);
event Refunded(uint256 indexed id, address indexed requester, uint256 amount);
event ReputationUpdated(address indexed agent, uint64 completed, uint64 timedOut, uint64 disputed);
```

### 4.4 State machine (authoritative)

```
Posted ─► Bidding ─(bidCloseBlock, award())─► Awarded ─(submit)─► Submitted ─(accept/autoRelease)─► Settled
   │                                             │                     │
   │                                             │                     └─(reject)─► Refunded
   │                                             └─(deadline, no submit)──────────► Refunded (timeoutSettle)
   └─(no bids by bidCloseBlock)──────────────────────────────────────────────────► Refunded
```
Every arrow is a tx → an event → a dashboard update → an explorer link. That chain of custody is the demo.

### 4.5 Security / correctness invariants (test these)
- **INV-1:** Sum of escrowed funds == contract native balance at all times (no leak, no over-release).
- **INV-2:** A task pays out at most once (`Settled`/`Refunded` are terminal; guard re-entrancy with checks-effects-interactions + `nonReentrant`).
- **INV-3:** `price <= maxBounty` always; surplus always returns to requester.
- **INV-4:** Only the winning `worker` can `submit`; only `requester` can `accept`/`reject`.
- **INV-5:** `award` is idempotent and only valid after `bidCloseBlock`.
- **INV-6:** Timeouts refund requester and cannot be front-run to steal escrow.
- Use OpenZeppelin `ReentrancyGuard`; pull-over-push not required if transfers are at terminal states, but prefer `call` with success checks.

---

## 5. Agent runtime specification [25% + 20%]

One process type, parameterized as requester or worker. Language: **Python + web3.py** (matches existing `pr_reviewer.py`) or **TS + viem** — pick one, don't mix chain I/O libs.

### 5.1 Shared
- Each agent loads a funded private key (`.env` / keystore), an RPC client, and a contract binding.
- Robust event subscription (poll `getLogs` by block range if websockets are flaky on testnet — assume polling is the safe default).
- Nonce management + retry with backoff; treat RPC hiccups as expected (see risks).

### 5.2 Worker loop
```
loop:
  on TaskPosted(t):
     if policy.shouldBid(t):                 # capability match + capacity
        price = policy.priceFor(t)           # f(maxBounty, my reputation, competition)
        tx: bid(t.id, price)
  after t.bidCloseBlock:
     tx: award(t.id)                          # anyone can call; ensures progress
  on Awarded(t) where t.worker == me:
     result = execute(t)                      # REAL work: LLM/tool call on the input
     resultHash = keccak(result)
     store(result)                            # off-chain store for UI display
     tx: submit(t.id, resultHash)
```
- `execute()` performs **genuine** work for ≥1 task type (e.g. summarize / classify / extract-to-JSON via a real model). The output shown in the UI is the real output; only its hash goes on-chain.
- `policy` can be rule-based in v1 (simple, explainable) with an optional LLM pricing brain as a flourish.

### 5.3 Requester loop
```
loop:
  task = nextTask()                           # from a seed queue or generated
  specHash, inputHash = hash(spec), hash(input)
  publish(spec, input)                        # off-chain store for workers + UI
  tx: postTask(specHash, inputHash, bidWindow, workWindow){value: maxBounty}
  on Submitted(t) where t.requester == me:
     ok = verify(t)                           # v1 verifier (see §5.4)
     tx: accept(t.id) if ok else reject(t.id)
```

### 5.4 Verifier (v1 — be explicit about scope) [integrity]
- v1 = **requester heuristic + confirm**: length/format/schema checks on the result, optional LLM "does this answer the spec?" grade, then `accept`/`reject`.
- Documented honestly as v1; **trustless verification (optimistic challenge window, later zk) is the headline roadmap item** (§14). Do not overclaim.

---

## 6. Indexer specification [25%]
- Subscribe/poll all §4.3 events from the deploy block forward.
- Maintain an in-memory (or SQLite) projection: tasks by status, per-agent stats, running totals (tasks, txs, value settled, cumulative gas).
- Serve the dashboard via a small API/WebSocket. Reorg handling can be minimal on a fast testnet, but re-derive from chain on restart (never trust local-only state).
- Every record carries its `txHash` so the UI can deep-link to `EXPLORER_BASE/tx/<hash>`.

## 7. Per-block settlement behavior [35%]
- Bidding windows measured in **blocks**, sized so a full task lifecycle completes in a handful of seconds (e.g. bidWindow ≈ 4–8 blocks, workWindow ≈ sized to LLM latency).
- The demo intentionally runs many tasks concurrently so the explorer shows **multiple txs per block / per second**. This is the visual proof of the chain's throughput being used, not just touched.
- Log realized gas per tx; aggregate to show total near-zero cost.

## 8. Dashboard specification [20% + 25%]
- **Live task feed:** cards Posted→Bidding→Awarded→Submitted→Settled, animating on each event.
- **Agent panel:** wallet (short), balance, reputation (completed/timeouts/disputes), total earned.
- **Every state change is an explorer link** (deep-linked tx). Non-negotiable — it's what makes claims verifiable.
- **"Marketplace is alive" counters:** total tasks, total txs, tasks/min, total value settled, total gas (~$0).
- **"Post a task" control** so a judge triggers the loop live.
- Keep it clean and screenshot-friendly; this doubles as Best Content.

## 9. Repository layout
```
hive/
  contracts/           # Solidity + Foundry/Hardhat, tests, deploy scripts
  agents/              # runtime (requester + worker), policy, verifier, execute()
  indexer/             # event listener + projection + API
  dashboard/           # web UI
  scripts/             # fund-from-faucet, deploy, seed-tasks, run-swarm
  docs/                # this TRD, PRD, architecture note, write-up
  .env.example         # RPC_URL, CHAIN_ID, EXPLORER_BASE, keys (never commit real keys)
  README.md            # quickstart: config → deploy → run → open dashboard
```

## 10. Demo instrumentation [20%]
- `scripts/seed-tasks` loads a set of **real** task specs (real inputs, real expected work).
- A "demo mode" that ramps concurrency for the money-shot throughput without changing correctness.
- A post-run summary printer: addresses, sample tx hashes, totals — copy straight into the submission form.

## 11. Verifiability & integrity [required — anti-DQ]
- No faked txs/data, ever (rules → disqualification). Everything shown on-chain is on-chain.
- Off-chain work is real; only hashes/refs go on-chain (standard, disclosed).
- You must be able to explain and reproduce every tx (judging requirement). Keep contracts small enough that you can.
- Ship contract source + addresses + representative tx hashes in the repo and the form.

## 12. Test plan [25%]
- **Contract unit/fuzz (Foundry):** each invariant INV-1..INV-6; full lifecycle happy path; every failure path (no bids, timeout, reject, double-settle attempt, non-winner submit, re-entrancy).
- **Integration (local fork/anvil for dev ONLY):** run 1 requester + 3 workers against a local node; assert end-to-end settlement + reputation deltas. (Submission txs must be on BOT Chain testnet, not the local fork.)
- **Testnet smoke:** the M0→M3 milestones each end with a verifiable on-chain artifact.
- **Chaos:** kill a worker mid-task → task times out and refunds (NFR resilience).

## 13. Build, deploy, run [25% + 20%]
- `scripts/deploy` → deploys to BOT Chain testnet, prints addresses + writes them to `.env`/`dashboard config`.
- `scripts/fund-from-faucet` (or documented manual steps) → funds N agent wallets.
- `README` quickstart must let a judge go from clone → running swarm → live dashboard in a few commands.
- Outputs required by the submission form: contract address(es), a tx hash, GitHub link, demo video, write-up, next steps, X link.

## 14. Extension surface ("room to grow" — scored under Innovation) [20%]
1. Trustless verification: optimistic challenge window → zk-verified compute.
2. Worker staking + slashing tied to on-chain reputation.
3. Open worker SDK: any external agent joins the market permissionlessly.
4. `Reputation` as a public ecosystem primitive other BOT Chain dApps read.
5. Specialized task-type submarkets; a real settlement/fee token.

## 15. Bounty opportunities to log while building (independent prize)
Keep a running `docs/findings.md` as you integrate. Likely candidates:
- Docs behind a login/403 (dev-docs returned 403 to automated fetch) → doc-access improvement.
- Any faucet, explorer verify, RPC, or chain-id friction → reproducible bug report + proposed fix.
Each accepted finding pays 50–100 USDT and is judged separately from the track award. File them clean: title, repro steps, impact, proposed solution, links/hashes.

## 16. Definition of done (submission gate)
- [ ] M0–M5 complete; contracts deployed + verifiable on scan.botchain.ai
- [ ] ≥1 requester + ≥3 workers run autonomously end-to-end on testnet
- [ ] ≥1 task type performs real LLM work; result hash on-chain matches shown output
- [ ] Dashboard live, every state change explorer-linked, counters running
- [ ] All INV-1..INV-6 tests pass
- [ ] README lets a judge reproduce; write-up explains native integration
- [ ] Demo video recorded; X post tagging @BOTChain_ai published
- [ ] Submission form filled: addresses, tx hash, repo, video, write-up, next steps, X link
- [ ] `docs/findings.md` submitted to the Bounty (if any accepted-quality findings)
```
