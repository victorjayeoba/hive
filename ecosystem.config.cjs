/**
 * PM2 process config for the Hive backend on a VPS.
 *
 *   pm2 start ecosystem.config.cjs      # start both services
 *   pm2 logs                            # tail logs
 *   pm2 status                          # see state
 *   pm2 save && pm2 startup             # survive reboots
 *
 * Contracts are deployed once (pnpm deploy — a one-off, not managed here).
 * These two are the long-running services:
 *   - indexer : chain events -> SQLite -> HTTP /snapshot + WebSocket on :4000
 *   - swarm   : the autonomous agents (1 requester + 3 workers)
 *
 * Both read config from the repo-root .env, so set that up first (see DEPLOY.md).
 *
 * We run the apps by launching node with tsx as a loader, resolving tsx's real
 * path via require.resolve so it works regardless of how pnpm laid out
 * node_modules (the .bin/tsx location varies by pnpm version and OS). Running
 * tsx directly (not via `pnpm <script>`) avoids pnpm re-checking deps /
 * supply-chain policy on every launch, which was crash-looping the processes.
 */
const { createRequire } = require("node:module");
const path = require("node:path");

// tsx ships an ESM loader entry; resolve it from any package that depends on tsx.
const req = createRequire(path.join(__dirname, "packages/indexer/package.json"));
const tsxLoader = req.resolve("tsx/esm"); // e.g. .../tsx/dist/loader.mjs

// node --import <tsx loader> lets plain `node` run TypeScript.
const nodeArgs = `--import ${tsxLoader}`;

module.exports = {
  apps: [
    {
      name: "hive-indexer",
      // node:sqlite is stable in Node 22.5+; NODE_NO_WARNINGS hides its notice.
      script: "packages/indexer/src/index.ts",
      cwd: __dirname,
      interpreter: "node",
      interpreter_args: nodeArgs,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      env: { NODE_ENV: "production", NODE_NO_WARNINGS: "1" },
    },
    {
      name: "hive-swarm",
      // The requester + worker agents (1 requester + 3 workers).
      script: "scripts/run-swarm.ts",
      cwd: __dirname,
      interpreter: "node",
      interpreter_args: nodeArgs,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 5000,
      env: { NODE_ENV: "production", NODE_NO_WARNINGS: "1" },
    },
  ],
};
