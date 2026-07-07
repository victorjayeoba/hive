#!/usr/bin/env -S npx tsx
// Hive MCP Server — exposes the BOT Chain on-chain toolkit over the Model Context
// Protocol (stdio). Any MCP client can connect: Hive worker agents, Claude
// Desktop, or any other agent framework. Run: `pnpm --filter @hive/mcp-tools start`
//
// This is the shareable platform surface: the tools that make on-chain worker
// agents possible. The Hive market is the first consumer, not the only one.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getWalletOverview,
  getWalletHistory,
  getTokenBalances,
  getTokenTransfers,
  decodeTransaction,
  getContractInfo,
  checkScam,
  assessWalletRisk,
  getChainStats,
  getAddressActivity,
  traceMoneyFlow,
} from "./tools.js";
import { getMarketStats, getTaskStatus, postTask } from "./market.js";

const server = new McpServer({
  name: "hive-onchain-toolkit",
  version: "0.1.0",
});

const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x address");
const txHash = z.string().regex(/^0x[a-fA-F0-9]{64}$/, "must be a 0x tx hash");

// Each tool returns JSON text content — structured data the calling agent reasons over.
const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

server.tool(
  "get_wallet_overview",
  "Snapshot of a BOT Chain address: balance, whether it's a contract, scam/verified flags, and any tags.",
  { address },
  async ({ address }) => json(await getWalletOverview(address)),
);

server.tool(
  "get_wallet_history",
  "Recent transactions for a BOT Chain address (method, counterparty, value, success/fail).",
  { address, limit: z.number().int().min(1).max(50).optional() },
  async ({ address, limit }) => json(await getWalletHistory(address, limit)),
);

server.tool(
  "get_token_balances",
  "ERC-20/721/1155 token holdings of a BOT Chain address.",
  { address },
  async ({ address }) => json(await getTokenBalances(address)),
);

server.tool(
  "get_token_transfers",
  "ERC-20 token transfer history for a BOT Chain address.",
  { address, limit: z.number().int().min(1).max(50).optional() },
  async ({ address, limit }) => json(await getTokenTransfers(address, limit)),
);

server.tool(
  "decode_transaction",
  "Decode a BOT Chain transaction into a readable form: method called, parameters, value, status.",
  { hash: txHash },
  async ({ hash }) => json(await decodeTransaction(hash)),
);

server.tool(
  "get_contract_info",
  "Contract metadata for an address: is it verified? a proxy? scam-flagged? with implementation addresses.",
  { address },
  async ({ address }) => json(await getContractInfo(address)),
);

server.tool(
  "check_scam",
  "Quick scam/risk screen of an address using explorer flags and heuristics.",
  { address },
  async ({ address }) => json(await checkScam(address)),
);

server.tool(
  "assess_wallet_risk",
  "Flagship analysis: composes overview + history into a risk score (0–100), level, and human-readable findings for a BOT Chain address.",
  { address },
  async ({ address }) => json(await assessWalletRisk(address)),
);

server.tool(
  "get_chain_stats",
  "BOT Chain network stats: average block time (ms), coin price, gas prices, totals. Proves the sub-second, low-fee thesis with live data.",
  {},
  async () => json(await getChainStats()),
);

server.tool(
  "get_address_activity",
  "Activity counters for a BOT Chain address: transaction count, token transfer count, gas used — how established/busy it is.",
  { address },
  async ({ address }) => json(await getAddressActivity(address)),
);

server.tool(
  "trace_money_flow",
  "Trace value moving in/out of a BOT Chain address via internal transactions — a forensic view of where funds actually went.",
  { address, limit: z.number().int().min(1).max(50).optional() },
  async ({ address, limit }) => json(await traceMoneyFlow(address, limit)),
);

// --- Market tools: hire the Hive market, not just read the chain ---

server.tool(
  "get_market_stats",
  "Live totals from the Hive on-chain labor market: tasks, bids, txs, settled count/value, active agents.",
  {},
  async () => json(await getMarketStats()),
);

server.tool(
  "get_task_status",
  "Status of a specific Hive market task by id: bidding/awarded/settled, winning worker, cleared price, explorer links.",
  { id: z.number().int().min(1) },
  async ({ id }) => json(await getTaskStatus(id)),
);

server.tool(
  "post_task",
  "Post a task to the Hive market on-chain so worker agents compete to fulfill it. Provide bytes32 hashes of the spec and input (content stays off-chain). Requires HIVE_REQUESTER_KEY to sign + fund the bounty. This is how an agent HIRES Hive's workers.",
  {
    specHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    inputHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    bountyBot: z.string().optional(),
    bidWindow: z.number().int().optional(),
    workWindow: z.number().int().optional(),
  },
  async (args) =>
    json(
      await postTask({
        specHash: args.specHash as `0x${string}`,
        inputHash: args.inputHash as `0x${string}`,
        bountyBot: args.bountyBot,
        bidWindow: args.bidWindow,
        workWindow: args.workWindow,
      }),
    ),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr so it doesn't corrupt the stdio MCP channel
  console.error("[hive-mcp] on-chain toolkit ready (stdio)");
}

main().catch((err) => {
  console.error("[hive-mcp] fatal", err);
  process.exit(1);
});
