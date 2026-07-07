import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { startPoller } from "./poller.js";
import { snapshot } from "./queries.js";
import { putContent, getContent } from "./content.js";
import { startUserAgentHost } from "./user-agent-host.js";
import type { UserAgentRow } from "./db.js";

const port = Number(process.env.INDEXER_PORT ?? 4000);

function publicAgentFields(a: UserAgentRow) {
  return {
    execAddress: a.execAddress, name: a.name, systemPrompt: a.systemPrompt,
    ownerAddress: a.ownerAddress, payoutAddress: a.payoutAddress,
    taskTypes: a.taskTypes, bidStrategy: a.bidStrategy, status: a.status, createdAt: a.createdAt,
  };
}

// HTTP endpoints (CORS-open):
//   GET  /snapshot        — the full market projection (dashboard)
//   GET  /health          — liveness
//   GET  /content/:hash   — task/result content by its on-chain hash
//   POST /content         — publish content { key, value } (posters + workers)
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const url = req.url ?? "";

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
  } else if (url === "/snapshot") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(snapshot()));
  } else if (url === "/health") {
    res.end("ok");
  } else if (url.startsWith("/content/") && req.method === "GET") {
    const key = decodeURIComponent(url.slice("/content/".length));
    const value = getContent(key);
    if (value === undefined) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not found" }));
    } else {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ key, value }));
    }
  } else if (url === "/content" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 1_000_000) req.destroy(); // 1MB cap
    });
    req.on("end", () => {
      try {
        const { key, value } = JSON.parse(body) as { key: string; value: unknown };
        if (!key) throw new Error("missing key");
        putContent(key, value);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, key }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: (e as Error).message }));
      }
    });
  } else if (url === "/agents" && req.method === "GET") {
    const { listUserAgents } = await import("./db.js");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(listUserAgents().map(publicAgentFields)));
  } else if (url.startsWith("/agents/") && req.method === "GET") {
    const { getUserAgent } = await import("./db.js");
    const exec = decodeURIComponent(url.slice("/agents/".length));
    const a = getUserAgent(exec);
    if (!a) { res.statusCode = 404; res.end(JSON.stringify({ error: "not found" })); }
    else { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(publicAgentFields(a))); }
  } else if (url === "/agents" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 200_000) req.destroy(); });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body);
        const { handleCreateAgent } = await import("./agents-api.js");
        let provisionExecWallet: (a: { name: string; ownerAddress: string }) => Promise<string>;
        try {
          ({ provisionExecWallet } = await import("./provision.js"));
        } catch {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "provisioning not available on this host" }));
          return;
        }
        const result = await handleCreateAgent(parsed, { provisionExecWallet });
        res.statusCode = result.ok ? 200 : result.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      } catch (e) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: (e as Error).message }));
      }
    });
  } else {
    res.statusCode = 404;
    res.end("not found");
  }
});

// WebSocket: push the latest snapshot whenever the projection changes.
const wss = new WebSocketServer({ server });
function broadcast() {
  const payload = JSON.stringify(snapshot());
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}
wss.on("connection", (ws) => ws.send(JSON.stringify(snapshot())));

startPoller(broadcast);

server.listen(port, () => {
  console.log(`[indexer] http + ws on :${port} — GET /snapshot`);
});

// Run user agents in THIS process — their exec keys live only in provision.ts's
// in-memory store, so the host that drives them (and sweeps earnings) must share
// the same process to read those keys via getExecKey().
startUserAgentHost();
