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
 */
module.exports = {
  apps: [
    {
      name: "hive-indexer",
      // Run tsx directly (not via `pnpm`, which re-runs a deps/supply-chain check
      // on every launch and loops). Resolve tsx from the indexer package. Run
      // from the repo root so the .env at the root is loaded. node:sqlite is
      // stable in Node 22.5+; NODE_NO_WARNINGS silences its experimental notice.
      script: "node_modules/.bin/tsx",
      args: "packages/indexer/src/index.ts",
      cwd: __dirname,
      interpreter: "none",
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      env: { NODE_ENV: "production", NODE_NO_WARNINGS: "1" },
    },
    {
      name: "hive-swarm",
      // The requester + worker agents. Run tsx directly (not via `pnpm`, which
      // re-checks deps/supply-chain on every launch).
      script: "node_modules/.bin/tsx",
      args: "scripts/run-swarm.ts",
      cwd: __dirname,
      interpreter: "none",
      autorestart: true,
      max_restarts: 20,
      restart_delay: 5000,
      env: { NODE_ENV: "production", NODE_NO_WARNINGS: "1" },
    },
  ],
};
