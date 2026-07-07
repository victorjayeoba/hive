/**
 * PM2 process config for the Hive backend on a VPS.
 *
 *   pm2 start ecosystem.config.cjs      # start the services
 *   pm2 logs / pm2 status               # observe
 *   pm2 save && pm2 startup             # survive reboots
 *
 * Long-running services (contracts are deployed once, separately):
 *   - indexer  : chain events -> SQLite -> HTTP /snapshot + WS + /content on :4000
 *   - swarm    : the autonomous agents (1 requester + 3 workers)
 *   - telegram : the human front-door bot (only runs if HIVE_TELEGRAM_TOKEN is set)
 *
 * Requires a flat node_modules (see .npmrc: node-linker=hoisted) so every dep
 * resolves from the repo root. Services launch `node` with tsx as an ESM loader
 * (resolved via require.resolve so the path is layout-independent), not via
 * `pnpm <script>` (which re-checks deps/supply-chain on every start and loops).
 *
 * All services read config from the repo-root .env.
 */
const { createRequire } = require("node:module");
const path = require("node:path");

const req = createRequire(path.join(__dirname, "package.json"));
const tsxLoader = req.resolve("tsx/esm");
const nodeArgs = `--import ${tsxLoader}`;

const service = (name, script, restart_delay = 4000) => ({
  name,
  script,
  cwd: __dirname,
  interpreter: "node",
  interpreter_args: nodeArgs,
  autorestart: true,
  max_restarts: 20,
  restart_delay,
  env: { NODE_ENV: "production", NODE_NO_WARNINGS: "1" },
});

module.exports = {
  apps: [
    service("hive-indexer", "packages/indexer/src/index.ts", 3000),
    service("hive-swarm", "scripts/run-swarm.ts", 5000),
    service("hive-telegram", "packages/telegram/src/index.ts", 5000),
    {
      // Cloudflare quick tunnel exposing the indexer publicly (for Vercel).
      // NOTE: a quick tunnel's URL changes whenever this restarts. On restart,
      // grab the new URL from `pm2 logs hive-tunnel` and update Vercel's
      // NEXT_PUBLIC_INDEXER_HTTP/WS. For a stable URL, use a named tunnel.
      name: "hive-tunnel",
      script: "cloudflared",
      args: "tunnel --url http://localhost:4000",
      cwd: __dirname,
      interpreter: "none",
      autorestart: true,
      max_restarts: 20,
      restart_delay: 5000,
    },
  ],
};
