#!/usr/bin/env -S npx tsx
// Hive MCP Server (HOSTED / HTTP) — the same on-chain toolkit, exposed over a
// public URL instead of stdio. Run this on a server (behind HTTPS) and ANY MCP
// client that supports remote servers can add the URL — no local files.
//
//   Endpoint:  POST /mcp   (Streamable HTTP transport)
//   Health:    GET  /health
//
// Run: `pnpm --filter @hive/mcp-tools http`  (PORT defaults to 8080)

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools } from "./register.js";

const PORT = Number(process.env.MCP_PORT ?? 8080);

// One MCP server instance, reused across sessions. Transports are per-session so
// multiple clients can connect concurrently.
const transports = new Map<string, StreamableHTTPServerTransport>();

function newServer(): McpServer {
  const server = new McpServer({ name: "hive-onchain-toolkit", version: "0.1.0" });
  registerTools(server);
  return server;
}

const http = createServer(async (req, res) => {
  // CORS so browser-based MCP clients can connect.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

  const url = req.url ?? "";

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (url === "/health") {
    return res.end("ok");
  }
  if (!url.startsWith("/mcp")) {
    res.statusCode = 404;
    return res.end("not found — MCP endpoint is POST /mcp");
  }

  // Read the JSON body (MCP messages are JSON).
  let body = "";
  for await (const chunk of req) body += chunk;
  let parsed: unknown;
  try {
    parsed = body ? JSON.parse(body) : undefined;
  } catch {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "invalid JSON" }));
  }

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport = sessionId ? transports.get(sessionId) : undefined;

  // New session: create a transport + server and connect them.
  if (!transport) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport!);
      },
    });
    transport.onclose = () => {
      if (transport!.sessionId) transports.delete(transport!.sessionId);
    };
    await newServer().connect(transport);
  }

  await transport.handleRequest(req, res, parsed);
});

http.listen(PORT, () => {
  console.error(`[hive-mcp] hosted on-chain toolkit ready — POST http://localhost:${PORT}/mcp`);
});
