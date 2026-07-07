# Hive MCP Toolkit — Plan

## The idea (one line)

**Hive MCP Server = a standalone "on-chain agent toolkit" that any worker agent
plugs into to get BOT Chain superpowers.** The Hive market is the first consumer,
but the toolkit is usable by any MCP-capable agent (your workers, a stranger's, or
Claude Desktop directly).

## Why this is the moat (not just "another agent marketplace")

The problem with "AI agent marketplace": workers are just OpenAI resellers →
"why not call the API directly?" kills it.

The fix: **workers do things a single API call can't** — read the chain, decode
txs, trace funds, detect scams — because they call **Hive's MCP tools**. The tools
make the workers capable. The better the toolkit, the more capable *every* worker,
the harder to replicate. That's a platform moat, not a code moat.

**Two products in one:** the toolkit (useful standalone) + the market (where the
toolkit earns money). Either pulls the other.

## Why it wins on BOT Chain specifically

The tools read **BOT Chain** data, so the toolkit is literally *how AI agents
interact with BOT Chain* — the on-ramp for agents into the ecosystem. That's a
thing BOT Chain wants to exist → maximum judge resonance, and it's the "AI + DePIN"
thesis made concrete.

## Architecture

```
                 ┌─────────────────────────────────┐
                 │      HIVE MCP SERVER             │
                 │   (on-chain agent toolkit)       │
                 │  reads BOT Chain via:            │
                 │   - rpc.bohr.life  (state)       │
                 │   - explorer API   (history)     │
                 │   - Hive indexer   (market data) │
                 └──────────────┬──────────────────┘
                                │ MCP protocol (standard)
           ┌────────────────────┼────────────────────┐
           ▼                    ▼                    ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │ Hive worker  │   │ Hive worker  │   │ ANY agent    │
   │ (your swarm) │   │ (specialized)│   │ (Claude etc.)│
   └──────┬───────┘   └──────┬───────┘   └──────────────┘
          │                  │
          ▼                  ▼
     ┌───────────────────────────────┐
     │   HIVE MARKET (on-chain)      │  ← workers compete, paid in BOT
     │   post → bid → award → settle │
     └───────────────────────────────┘
```

New package: **`packages/mcp-tools/`** — an MCP server built with
`@modelcontextprotocol/sdk`, exposing on-chain tools. Workers (in `packages/agents`)
become MCP clients of it.

## The toolkit (tiered by data source & ambition)

### Tier 1 — read/analyze, RPC-based (always works via rpc.bohr.life)
| Tool | Does | Source |
|---|---|---|
| `getBalance(addr)` | native BOT balance | RPC |
| `getTokenBalances(addr)` | ERC-20 holdings | RPC (balanceOf) |
| `getApprovals(addr)` | active token approvals (#1 scam vector) | RPC (Approval logs / allowance) |
| `getTransaction(hash)` | raw tx + receipt | RPC |
| `decodeTransaction(hash)` | plain-English: what the tx did | RPC + ABI decode |
| `getContractInfo(addr)` | is it a contract? verified? bytecode patterns | RPC |
| `simulateCall(...)` | "what would this tx do?" without sending | RPC eth_call |

### Tier 2 — enrich/trace (needs explorer API or the Hive indexer)
| Tool | Does | Source |
|---|---|---|
| `getWalletHistory(addr)` | list of the wallet's txs | explorer API or indexer |
| `getTokenTransfers(addr)` | ERC-20 transfer history | explorer API |
| `traceMoneyFlow(addr)` | follow funds across addresses (forensics) | explorer API + graph |
| `getTokenPrice(token)` | DeFi price context | RPC (pools) or price feed |

### Tier 3 — ACT (endgame; deferred — security-heavy, moves real money)
| Tool | Does |
|---|---|
| `executeTransaction(...)` | agent acts on-chain (with user authorization) |
| `setAlert(...)` | ongoing monitoring → alert |

### Composed analysis tools (the flagship value)
| Tool | Does |
|---|---|
| `assessWalletRisk(addr)` | composes the above into a risk report + score |
| `explainTransaction(hash)` | full plain-English breakdown of a complex tx |

## Flagship demo capability

`assessWalletRisk(0xABC)` → the worker calls several MCP tools (balances,
approvals, history, scam patterns), reasons over the data with the LLM, and returns
a real **risk report + score** — something no single API call can produce. That's
the "this is an agent, not an API reseller" proof.

## DATA SOURCE — CONFIRMED: Blockscout API v2 (best case) ✅

`scan.bohr.life` is a **Blockscout** explorer with a full REST API v2 at
`https://scan.bohr.life/api/v2/...`. This unlocks the *entire* toolkit — no
self-indexing needed. Confirmed endpoints:

- `GET /api/v2/addresses/{addr}` — balance, `is_contract`, **`is_scam`** (built-in
  scam flag!), `is_verified`, `has_token_transfers`, `has_tokens`,
  `implementations` (proxy detection), `public_tags` / `private_tags`,
  `watchlist_names`
- `GET /api/v2/addresses/{addr}/transactions` — full tx history
- `GET /api/v2/addresses/{addr}/token-transfers` — ERC-20 transfer history
- `GET /api/v2/addresses/{addr}/token-balances` — holdings
- `GET /api/v2/transactions/{hash}` — decoded tx details
- `GET /api/v2/token-transfers`, `/internal-transactions`, `/search`, `/blocks`

**Big win:** Blockscout's `is_scam`, `is_verified`, tags, and decoded txs mean
several "analysis" tools are near-free — the API already computed them. The MCP
server is mostly thin wrappers over these + LLM reasoning to compose reports.

Base URL for the tools: `HIVE_EXPLORER_API = https://scan.bohr.life/api/v2`
(RPC `rpc.bohr.life` still used for live state / simulateCall).

## Build phases

1. **Scaffold** `packages/mcp-tools/` — MCP server skeleton + BOT Chain RPC client.
2. **Tier 1 tools** (RPC-based) — the reliable foundation.
3. **Flagship `assessWalletRisk`** — compose Tier 1 into a real report.
4. **Wire a worker as an MCP client** — the swarm worker uses the toolkit to do a
   real on-chain task type instead of the toy summarize/classify/extract.
5. **Tier 2** (if explorer API exists) — history/transfers/tracing.
6. **New task types** in `seed.ts` — "analyze wallet", "explain tx" — the on-chain
   wedge instead of toy tasks.
7. **(Later) Tier 3** — acting on-chain, with an authorization model.

## Honest scoping vs. the hackathon

The whole protocol (post→bid→award→settle) already works and is chain-agnostic —
no rebuild. The new work is the MCP server + one flagship on-chain capability.
For the deadline: phases 1–4 + phase 6 (one real task type) = a demo that's clearly
differentiated ("workers do real on-chain analysis with Hive's tools"). Tier 2/3
and the full toolkit are the post-hackathon platform build.

## Competitive honesty

On-chain MCP servers exist (Alchemy, thirdweb, Goat SDK, AgentKit). But nobody
pairs the toolkit with a **competitive on-chain labor market that pays agents in
BOT to use it.** The tools aren't the product — the tools + market + settlement as
one loop is. That fusion is the defensible thing.
