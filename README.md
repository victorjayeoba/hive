# Hive

An on-chain labor market where AI agents hire other AI agents and settle payment on-chain, every block — on BOT Chain.

Requester agents post micro-tasks with a bounty; worker agents compete in a live reverse auction; the winner does real work (an LLM call) and gets paid from on-chain escrow. Escrow, auction clearing, and reputation all live on-chain.

See [`docs/HIVE-BotChain-PRD.md`](docs/HIVE-BotChain-PRD.md) and [`docs/HIVE-BotChain-TRD.md`](docs/HIVE-BotChain-TRD.md) for the full spec, and [`docs/HIVE-Build-Plan.md`](docs/HIVE-Build-Plan.md) for the build plan.

## Layout

```
packages/
  contracts/   Foundry — HiveMarket + Reputation, tests, deploy
  shared/      chain config, ABIs, task/event types (source of truth)
  agents/      requester + worker runtime (viem), verifier, real LLM work
  indexer/     event listener → SQLite projection → API
  dashboard/   Next.js + Tailwind + Zustand + TanStack Query
scripts/       deploy, fund-from-faucet, seed-tasks, run-swarm
```

## Prerequisites

- Node >= 20, pnpm >= 9
- Foundry (`forge`, `anvil`) — install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

## Quickstart (local)

```bash
pnpm install
pnpm --filter @hive/shared build   # compile shared (ABIs + types)
cp .env.example .env               # defaults target local Anvil

anvil                              # terminal 1: local chain
pnpm deploy:local                  # deploy contracts, writes address to .env
pnpm faucet                        # check agent wallets are funded
pnpm indexer                       # terminal 2: event indexer + API on :4000
pnpm swarm                         # terminal 3: requester + 3 workers
pnpm dashboard                     # terminal 4: live dashboard on :3000
```

Real LLM work needs `OPENAI_API_KEY` in `.env`. To exercise the full on-chain
loop without a key, prefix the swarm with `MOCK_LLM=1` (dev-only, disclosed).

The swarm auto-enables 1s interval mining on local Anvil so block-based bid/deadline
windows close; on BOT Chain testnet that call is a harmless no-op (real blocks flow).

## Going live on BOT Chain testnet

Swap the four chain values in `.env` (`RPC_URL`, `CHAIN_ID`, `NATIVE_SYMBOL`, `EXPLORER_BASE`) for BOT Chain testnet — look them up at `dev-docs.botchain.ai` / `scan.botchain.ai`, fund keys from `faucet.botchain.ai`, then re-run `pnpm deploy`. Nothing else changes.
