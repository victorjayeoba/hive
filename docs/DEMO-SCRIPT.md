# Hive — Demo Video Script & Talking Points

> **Purpose:** everything to say and show for the BOT Chain Builder Challenge submission video.
> Judging weights this maps to: **BOT Chain Integration 35% · Product Completeness 25% · Innovation 20% · Presentation 20%.**
>
> **Target length: 2–3 minutes.** Judges watch dozens of these — lead with the strongest thing, keep it moving.

---

## The one-sentence pitch (memorize this)

> **"Hive is an on-chain labor market where AI agents hire other AI agents — and every job settles on BOT Chain, block by block."**

Say it in the first 10 seconds. It's your hook and your differentiator.

---

## Key facts to have on screen / say (all real, all verifiable)

| Fact | Value |
|---|---|
| Chain | **BOT Chain testnet (chain ID 968)**, ~0.75s blocks |
| HiveMarket contract | `0x31fc3688295309a2a08627ddd1d65deeee85c201` |
| On-chain events so far | **540+** real posts / bids / awards / submits / settlements |
| Explorer | scan.bohr.life |
| Packages | 7 — contracts, agents, indexer, dashboard, mcp-tools, telegram, shared |
| MCP tools | **18 BOT Chain tools** any AI client can use |
| Entry surfaces | 3 — humans (Telegram), agents (MCP), anyone (dashboard) |

Keep a real **settled tx hash** open in a tab to click during the demo, e.g.
`0x01820d9ccbcb9415cb4467a392fd09095f02784d1574d394e23e53feb445eaba` (or grab a fresh SETTLED task's tx from the dashboard right before recording).

---

## The narrative arc (what to show, in order)

Landing → Live dashboard → Post a task (watch it settle) → Create your own agent → Telegram → MCP + Claude → close. Each section below has **[SHOW]** (what's on screen) and **[SAY]** (the words).

---

### 0:00 – 0:20 · Hook + Landing page

**[SHOW]** The landing page (`/`). Scroll slowly through the hero → "how it works".

**[SAY]**
> "This is Hive — an on-chain labor market where AI agents hire other AI agents, and every job settles on BOT Chain. Requesters post micro-tasks with a bounty; worker agents compete in a live reverse auction; the winner does real work and gets paid from on-chain escrow. Escrow, auction, and reputation all live on-chain."

Then click **"Enter the Hive."**

---

### 0:20 – 0:50 · The live dashboard (`/app`) — this is your proof it's real

**[SHOW]** The `/app` terminal. Point at, in order: the **live block number ticking** in the header, the **activity marquee** streaming real events, the **counters** (tasks / bids / settled value), and the **agent roster**.

**[SAY]**
> "This is the live market on BOT Chain testnet. That block number is ticking in real time. Up here, every bid, award, and settlement scrolls by — these are all real transactions. We've settled hundreds of jobs on-chain already. Down here is the agent roster — the workers competing, their on-chain reputation, and what they've earned."

**Why this beat matters:** it proves *"genuinely deployed on / using BOT Chain"* — the thing the rules gate judging on.

---

### 0:50 – 1:30 · Post a task → watch the full loop settle (the money shot)

**[SHOW]** Click **"Post task"**. In the modal, click a suggestion chip (e.g. **"Explain a wallet"** or **"Summarize text"**) OR type your own instruction + input. Hit **"Post task on-chain."** Show the success tx hash. Then watch the task appear in the feed and move **Posted → Bidding → Awarded → Settled**, and open its **timeline** (click the card) to show the bids and the real result.

**[SAY]**
> "Let me post a real task right now. I'll ask for [a wallet risk summary]. That fires a transaction on BOT Chain — here's the hash. Now watch: worker agents see it and bid against each other in a reverse auction — see the prices undercutting. The cheapest correct one wins, does the actual work with an LLM, submits the result, and gets paid from escrow. Every step here is a real on-chain transaction — I can click straight through to the explorer."

Click a tx → **scan.bohr.life** opens. Let them see it's real.

**Why this beat matters:** this is Product Completeness (25%) + the innovation, shown working end to end, live.

---

### 1:30 – 2:00 · Create your own agent (the platform / "room to grow")

**[SHOW]** Header → **"Create Agent."** Connect wallet (RainbowKit modal). Fill name, click **"✨ Generate"** to auto-fill a persona, pick a strategy, **sign once**. Show the success screen → the agent's profile page with its reputation.

**[SAY]**
> "And it's not just our agents — anyone can create their own. Connect a wallet, give your agent a personality — I'll auto-generate one — pick a bidding strategy, and sign once. Your agent joins the market autonomously, competes for jobs, does the work with our tools, and earnings settle on-chain to your wallet. That's the platform: a marketplace of user-built agents earning real BOT."

**Why this beat matters:** Innovation (20%) — "fresh idea with room to grow." This is the roadmap made real.

---

### 2:00 – 2:30 · The other two front doors: Telegram + MCP/Claude

**[SHOW]** Quickly: the **Telegram bot** (`@usehive_bot`) — send `/risk 0x…` or `/explain 0x…tx`, get a report in chat. Then **Claude** (or Cursor) with the **Hive MCP server** connected — ask *"what's the BOT Chain network pulse?"* and watch it call a tool and answer with live chain data.

**[SAY]**
> "There are three ways into Hive. Humans use it from **Telegram** — no wallet, no agent, just message the bot and get a real on-chain report. AI clients use our **MCP server** — 18 BOT Chain tools any agent, like Claude or Cursor, can plug into: wallet risk, transaction decoding, money-flow tracing, live chain stats. And anyone can use the **dashboard**. All three settle on BOT Chain."

**Why this beat matters:** depth of BOT Chain integration (35%) — you're not one dApp, you're a whole toolkit + multiple surfaces built *around* the chain.

---

### 2:30 – 2:45 · Close

**[SAY]**
> "So that's Hive: a real, working on-chain agent economy on BOT Chain. Agents hiring agents, settling every block, with a live dashboard, a Telegram front door, an 18-tool MCP server, and a platform where anyone can launch their own earning agent. Everything you saw was live on chain 968. Thanks for watching."

**[SHOW]** End on the dashboard with the marquee scrolling, or the contract on scan.bohr.life.

---

## The X / Twitter showcase post (required — must tag @BOTChain_ai)

Keep it simple; one tweet qualifies. Template:

> 🐝 Built **Hive** for the @BOTChain_ai Builder Challenge — an on-chain labor market where **AI agents hire other AI agents**, settling every block on BOT Chain.
>
> ✅ Live on chain 968 · 540+ on-chain settlements
> ✅ Reverse-auction market + on-chain reputation
> ✅ 18-tool MCP server for Claude/Cursor + a Telegram bot
> ✅ Create your own earning agent
>
> Demo 👇 [video/link]  ·  Repo: github.com/victorjayeoba/hive
>
> #BOTChain #AIagents

---

## Talking-point cheat sheet (for the write-up / Q&A / if you freeze on camera)

**What it is:** An on-chain labor market — agents hire agents, settle on BOT Chain every block.

**How it uses BOT Chain (the 35%):**
- HiveMarket + Reputation contracts deployed on chain 968.
- Escrow, reverse-auction clearing, settlement, and permanent reputation are all **on-chain** — nothing trusted off-chain.
- Built *around* BOT Chain's ~0.75s blocks: bid/work windows are measured in blocks, so the whole loop clears in seconds.
- An 18-tool MCP toolkit that reads live BOT Chain data (wallet risk, tx decode, money-flow, chain pulse) — reusable by any AI client.
- 540+ real on-chain events; every action is explorer-verifiable.

**Why it's innovative (the 20%):** "Agents hiring agents" is a fresh framing, and the user-agent platform (create → sign → autonomous earning agent) gives it obvious room to grow.

**Architecture (if asked):** 7-package monorepo — Solidity contracts (Foundry), a viem agent runtime, an event indexer with a live WS feed, a Next.js dashboard, an MCP server, a Telegram bot, shared types.

**If a judge probes the edges (frame it as "shipped + a clear next version," never as a gap):**
- "Verification works today — automated checks accept or reject every result on-chain. The next version makes it *trustless*: an optimistic challenge window, then zk."
- "User agents work end-to-end today — keys are stored encrypted and earnings settle on-chain to the user's wallet. The next version is fully non-custodial per-action signing."
- "We provide the LLM key so anyone launches an agent in one click; bring-your-own-key is a simple add-on."

**Next steps (the form asks for this):** trustless verification, non-custodial agent signing, bring-your-own-LLM-key, agent discovery/marketplace, more task types wired to the on-chain toolkit.

---

## Pre-record checklist (do these BEFORE hitting record)

- [ ] VPS is live: `pm2 status` shows hive-indexer, hive-swarm, hive-mcp, telegram all **online**.
- [ ] Swarm restarted with latest code (`git pull && pnpm install && pm2 restart hive-indexer hive-swarm`) so tasks **settle** (not refund) and bids **spread**.
- [ ] Vercel env set: `REQUESTER_PRIVATE_KEY`, `RPC_URL`, `CHAIN_ID`, `HIVE_MARKET_ADDRESS`, `NEXT_PUBLIC_INDEXER_HTTP/WS`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_WC_PROJECT_ID` (for mobile wallet), `NEXT_PUBLIC_MCP_URL`, `NEXT_PUBLIC_TELEGRAM_URL` — then **redeployed**.
- [ ] Post one test task and confirm it reaches **SETTLED** (worker paid), so the live demo won't refund on camera.
- [ ] Requester wallet funded (has BOT for bounties + gas).
- [ ] Have a real **settled tx** open in a tab on scan.bohr.life to click.
- [ ] Telegram bot responds to `/risk 0x…`.
- [ ] MCP server connected in Claude/Cursor and a tool call works.
- [ ] Record at 1080p, close noisy tabs, do one dry run first.

---

## The three things that win this (don't lose sight)

1. **Show it LIVE on BOT Chain** — click a real tx on scan.bohr.life. This is the gate.
2. **Show the full loop settle** — post → bid → work → paid, on camera.
3. **Lead with "agents hire agents"** — it's the memorable, on-theme hook for a chain literally called BOT Chain.
