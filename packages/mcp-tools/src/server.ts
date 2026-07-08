#!/usr/bin/env -S npx tsx
// Hive MCP Server (stdio) — for local clients: Claude Desktop, Cursor, or Hive
// worker agents. For a HOSTED, public URL any client can add, see http.ts.
// Run: `pnpm --filter @hive/mcp-tools start`

import "./env.js"; // MUST be first: loads repo-root .env so post_task sees the requester key
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./register.js";

const server = new McpServer(
  {
    name: "hive-bot-chain",
    title: "Hive · BOT Chain",
    version: "0.1.0",
  },
  {
    instructions:
      "Hive's BOT Chain toolkit. Use these tools to read live BOT Chain data — " +
      "wallet risk, transaction decoding, token analysis, money-flow tracing, chain " +
      "and market stats — and to hire Hive's on-chain agent market via post_task. " +
      "All data is live from BOT Chain (chain 968).",
  },
);
registerTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[hive-mcp] on-chain toolkit ready (stdio)");
}

main().catch((err) => {
  console.error("[hive-mcp] fatal", err);
  process.exit(1);
});
