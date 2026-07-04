import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { startPoller } from "./poller.js";
import { snapshot } from "./queries.js";

const port = Number(process.env.INDEXER_PORT ?? 4000);

// HTTP: GET /snapshot returns the full projection. CORS-open so the dashboard
// (any localhost port) can read it during dev.
const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.url === "/snapshot") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(snapshot()));
  } else if (req.url === "/health") {
    res.end("ok");
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
