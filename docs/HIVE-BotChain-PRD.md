# Hive — Product Requirements Document

**An on-chain labor market where AI agents hire other AI agents and settle payment on-chain, every block.**

> Submission target: **BOT Chain Builder Challenge #1** — AI Agent Track
> Prize target: Grand Prize + AI Agent Track 1st + Best Content
> Deadline: **Jul 8, 2026, 23:59 UTC+8**
> Status: PRD v1 — draft for build

---

## 0. TL;DR (read this first)

Hive is a marketplace where autonomous AI agents post micro-tasks with a bounty, and *other* AI agents bid to do the work — with escrow, settlement, and reputation all handled **on-chain, block by block**, on BOT Chain.

The whole thing is only viable because of BOT Chain's two headline properties: **near-zero fees** make machine-to-machine micropayments economical, and **~0.75s block times** make a live, continuously-clearing auction feel real-time. On a slow/expensive chain this design is absurd — which is precisely why it maxes the "native BOT Chain integration" scoring and dodges the "generic trading bot" crowd.

**The money shot:** during the demo, dozens of *real* transactions land per second on BOT Chain's own explorer as agents bid, win, submit work, and get paid. That screenshot is the pitch.

---

## 1. Why this wins THIS hackathon (scorecard-driven)

The official judging weights, and how Hive is engineered against each:

| Dimension | Weight | How Hive scores maximum |
|---|---|---|
| **BOT Chain Integration** | 35% | Core loop is *impossible* without near-zero fees + sub-second blocks. Escrow, auction clearing, and reputation are all on-chain. This is "native, deep use of chain capabilities," not "swapped the RPC." |
| **Product Completeness** | 25% | End-to-end runnable demo: real LLM work performed, real escrow released, real txs on the explorer. No mockups. |
| **Innovation** | 20% | An *agent-to-agent labor economy* is the literal thesis of an "AI + DePIN" chain, and few will build it. High "room to grow." |
| **Presentation** | 20% | Live-ticking visualization + explorer links + clean demo video + technical write-up. Also a Best Content candidate. |

**Resonance factor:** BOT Chain is *"an EVM-compatible L1 built for AI and DePIN applications."* Hive is the clearest possible embodiment of that sentence. Judges are the internal team — building the thing their chain exists for is worth real weight, and the rules explicitly award extra weight to projects "innovating around the BOT Chain ecosystem."

**Anti-similarity:** The rules group "highly similar" submissions and reward the earlier + higher-quality one. Most AI-agent entries will be "an agent that trades." Hive is categorically different (a labor market, not a trading bot), so it competes in its own lane.

---

## 2. Problem statement

Autonomous AI agents are proliferating, but they have no native way to **pay each other for work**. Today an agent that needs a sub-task done (summarize a doc, classify an image, run a computation) must either do it itself or call a centralized API with a human's credit card behind it. There is:

- **No trustless settlement** — how does a requester know the work was done before paying, and how does a worker know it'll be paid?
- **No economical micropayment rail** — a $0.002 task can't carry a $2 gas fee.
- **No portable reputation** — no way to know which worker agents are reliable.

This is exactly the gap a fast, near-zero-fee, EVM chain built for AI is positioned to fill.

## 3. Solution

Hive is an **on-chain protocol + agent runtime + live dashboard** implementing a compute/task labor market:

1. A **requester agent** posts a task (a prompt/spec + input) with a bounty locked into an on-chain **escrow**.
2. **Worker agents** compete in a short **reverse auction** (bid the price down) that clears on-chain.
3. The winning worker performs the task **off-chain** (a real LLM/tool call) and submits the **result + a content hash** on-chain.
4. On acceptance (auto-check and/or requester confirmation), **escrow releases** payment to the worker and updates both agents' **on-chain reputation**.

All state transitions — post, bid, award, submit, settle — are on-chain events, landing block-by-block. The dashboard visualizes them live and links every action to the BOT Chain explorer.

## 4. Goals & non-goals

**Goals (must-have for submission):**
- Real end-to-end task lifecycle executes on BOT Chain testnet with real txs.
- At least one requester agent and ≥3 worker agents run autonomously.
- Real LLM work is performed for at least one task type.
- A live dashboard shows the marketplace and links to on-chain txs.
- A clear, honest demo video + technical write-up + X post tagging @BOTChain_ai.

**Non-goals (explicitly cut — YAGNI for a 1-week judged demo):**
- No mainnet deployment, no real-money token economics.
- No general-purpose off-chain compute verification (we use hash-commit + optional requester check, not zk/optimistic proofs — noted as future work).
- No account abstraction / gasless UX polish beyond what's needed to demo.
- No mobile app. No multi-chain. No governance token.

## 5. Users / actors

| Actor | Description |
|---|---|
| **Requester agent** | Autonomous process holding a BOT Chain wallet; needs tasks done; posts + funds them. |
| **Worker agent** | Autonomous process holding a wallet; watches for tasks, bids, executes, submits, gets paid. |
| **Human operator (judge/you)** | Watches the dashboard, can post a task manually, inspects txs on the explorer. |
| **Verifier (v1 = simple)** | Logic that decides if a submission is acceptable (auto-heuristic and/or requester confirmation). |

## 6. Functional requirements

### 6.1 On-chain (smart contracts)
- **FR-1 Task posting:** Requester creates a task with `{specHash, inputHash, bounty, deadline}`; bounty transferred into escrow.
- **FR-2 Reverse auction:** Workers submit bids `≤ current bounty` within a bidding window; lowest valid bid (with tie-break by reputation/first-seen) wins.
- **FR-3 Award:** Contract records the winning worker and moves task to `Awarded`.
- **FR-4 Submission:** Winner submits `{resultHash}` before deadline.
- **FR-5 Settlement:** On acceptance → pay worker the agreed price, refund any surplus to requester, mark task `Settled`. On timeout/no-submission → refund requester, penalize worker.
- **FR-6 Reputation:** On-chain counters per agent: tasks completed, disputes, avg rating. Cheap increments (near-zero fee makes this fine to write every task).
- **FR-7 Events:** Every transition emits an event the dashboard indexes.

### 6.2 Off-chain (agent runtime)
- **FR-8:** Each agent is a long-running process with its own funded BOT Chain key.
- **FR-9 Worker loop:** watch `TaskPosted` events → decide whether to bid + at what price (a small policy/LLM) → submit bid → if awarded, execute the real task → submit result hash.
- **FR-10 Requester loop:** generate/queue tasks → post + fund → on submission, run the verifier → accept or reject.
- **FR-11 Real work:** at least one task type calls a real model (e.g. "summarize this text", "classify sentiment", "extract fields to JSON") and the output is what gets hashed on-chain and shown in the UI.

### 6.3 Dashboard (frontend)
- **FR-12:** Live feed of tasks with status (Posted → Bidding → Awarded → Submitted → Settled).
- **FR-13:** Per-agent cards: wallet, balance, reputation, earnings.
- **FR-14:** Every state change links to the BOT Chain explorer tx.
- **FR-15:** A running counter: total txs, total value settled, tasks/min — the "look how alive this is" panel.
- **FR-16:** A "post a task" button so a judge can trigger the loop themselves live.

## 7. Non-functional requirements
- **NFR-1 Verifiability:** every claim in the demo must be independently checkable on scan.botchain.ai. No faked txs, ever (also a disqualification rule).
- **NFR-2 Explicability:** you must be able to explain any line of the contracts and runtime (judging requires this).
- **NFR-3 Resilience:** if an agent crashes, the marketplace keeps running; tasks time out and refund.
- **NFR-4 Cost:** the demo should visibly cost almost nothing in gas — screenshot the fee totals.

## 8. Architecture (high level)

```
┌────────────────────────────────────────────────────────────┐
│                        BOT Chain (EVM L1)                    │
│   Hive contracts: TaskEscrow · Auction · Reputation          │
│   Emits events every ~0.75s block · near-zero fees           │
└───────▲───────────────▲───────────────▲──────────┬──────────┘
        │ post/fund      │ bid/award     │ submit/settle       │ events
        │                │               │                     ▼
 ┌──────┴─────┐   ┌──────┴─────┐   ┌──────┴─────┐      ┌───────────────┐
 │ Requester  │   │  Worker A  │   │  Worker B… │      │  Indexer +    │
 │  agent(s)  │   │  agent     │   │  agent     │      │  Dashboard    │
 │ +LLM tasks │   │ +real LLM  │   │ +real LLM  │      │ (live + scan  │
 └────────────┘   └────────────┘   └────────────┘      │  links)       │
                                                       └───────────────┘
```

**Components:**
1. **Contracts** (Solidity, deployed via Hardhat/Foundry to BOT Chain testnet).
2. **Agent runtime** (one process type, N instances; a small policy or LLM decides bidding; ethers/viem for chain I/O).
3. **Indexer + dashboard** (listens to contract events, serves a live web UI; links to explorer).

## 9. Tech stack (proposed)
- **Contracts:** Solidity + Foundry (fast tests) or Hardhat; deploy to BOT Chain testnet.
- **Agents:** TypeScript (viem/ethers) or Python (web3.py) — pick the one your agent-code is already in; the opened `pr_reviewer.py` suggests Python is in play, so **Python + web3.py** is a fine default, with a thin TS option for the frontend.
- **LLM:** whatever key you have (Claude/OpenAI) for the real task execution.
- **Frontend:** React/Next + a WebSocket/event stream; minimal, fast, screenshot-friendly.
- **Chain config (LOOK UP AT BUILD TIME — do not guess):** RPC URL, chain ID, native symbol (BOT), explorer base URL, faucet. Sources: dev-docs.botchain.ai, faucet.botchain.ai, scan.botchain.ai.

## 10. The demo (this is 20%+ of the score)

**Live script (~2–3 min):**
1. Open the dashboard — quiet, a few idle agents with funded wallets shown.
2. Click "post a task" (or let a requester auto-post). A real task appears: e.g. *"Summarize this 200-word paragraph to 20 words."*
3. Watch 3 worker agents bid the price down in real time — bids landing on-chain each block.
4. Winner is awarded; performs the real summary; submits result + hash.
5. Requester's verifier accepts → escrow releases → worker's balance + reputation tick up.
6. Cut to **scan.botchain.ai** showing the actual tx trail and the near-zero fees.
7. Show the counter: *"47 tasks settled, 190 txs, total gas $0.00X"* in 2 minutes.

**Deliverables checklist (from the rules):**
- [ ] Deployed contract address(es) + a representative tx hash
- [ ] Public GitHub repo (clean README, run instructions, architecture)
- [ ] Demo video (screen-recorded live run) + live demo link if hosted
- [ ] Technical write-up (this PRD + an implementation note)
- [ ] "Next steps" section (below)
- [ ] X showcase tweet: project name + what it solves + how it uses BOT Chain + demo + repo + track, **tagging @BOTChain_ai**

## 11. The honesty line (stay clear of disqualification)

The rules disqualify fake demos/txs/data. Hive's rule: **anything shown as on-chain must BE on-chain and verifiable.** What's allowed and clearly labeled:
- Off-chain LLM work is genuinely performed; only its hash + result reference go on-chain (standard, honest).
- If you seed the marketplace with pre-scripted tasks for the demo, say so — the *execution and settlement* are still real.
- The verifier in v1 is simple (heuristic/requester-confirm), and the write-up says so plainly, listing stronger verification as future work.

You must be able to explain and reproduce every on-chain action. Build for that.

## 12. Bonus: stack a second and third prize (allowed & encouraged)
- **Best Content (independent prize):** the live-viz run is inherently great content — a tight demo video + a thread explaining the agent-economy idea.
- **PR / Bug / Optimization Bounty (independent prize):** while integrating, you WILL hit doc gaps or explorer/faucet quirks. File clear, reproducible bug reports / doc PRs. Each accepted one pays 50–100 USDT and is judged separately.

## 13. Milestones (order, not dates — build agents can parallelize)
1. **M0 Chain up:** wallet funded from faucet, a hello-world contract deployed + verified on scan. Proves the pipeline.
2. **M1 Contracts:** TaskEscrow + Auction + Reputation, with Foundry tests. Deploy to testnet.
3. **M2 One agent, one task:** a single worker executes one real task end-to-end on-chain.
4. **M3 Swarm:** N workers + reverse auction clearing live; requester loop auto-posting.
5. **M4 Dashboard:** live event feed + explorer links + counters.
6. **M5 Polish + record:** demo script rehearsed, video recorded, README + write-up, X post, submit.
7. **M6 Bounty pass:** file the doc/bug findings collected along the way.

## 14. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Testnet RPC/faucet flaky | Cache config, add retries, record demo when stable; keep a local-fork fallback for dev only (never for submission txs). |
| "Similar submission" grouping | Lean hard into the *labor-market* framing, submit early, max quality + write-up. |
| Verification looks weak | Be explicit it's v1; frame trustless verification as the compelling roadmap. |
| Demo depends on live LLM latency | Pre-warm; pick fast/cheap task types; have a canned-but-real fallback task. |
| Judges can't verify | Every UI action links to a real explorer tx; provide addresses + hashes in the form. |

## 15. Next steps (put a version of this in the submission)
- Trustless/verifiable off-chain work (optimistic challenge window; later zk).
- Agent staking/slashing for reliability; richer reputation.
- Open worker SDK so anyone's agent can join the market.
- Task-type marketplace (specialized worker agents).
- Real settlement token + fee model as a path to an ecosystem primitive.

---

*Owner: (you). Track: AI Agent. Chain: BOT Chain testnet. Prizes targeted: Grand Prize · AI Agent 1st · Best Content · Bounty.*
