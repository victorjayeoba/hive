#!/usr/bin/env -S npx tsx
// Hive MCP Server (stdio) — for local clients: Claude Desktop, Cursor, or Hive
// worker agents. For a HOSTED, public URL any client can add, see http.ts.
// Run: `pnpm --filter @hive/mcp-tools start`

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./register.js";

const server = new McpServer({ name: "hive-onchain-toolkit", version: "0.1.0" });
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
