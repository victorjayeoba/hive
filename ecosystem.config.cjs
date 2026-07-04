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
      // Run via the package's own start script so tsx resolves from the indexer
      // package (pnpm's strict node_modules doesn't hoist it to the repo root).
      // Uses node:sqlite (stable in Node 22.5+) — requires Node 22+.
      script: "pnpm",
      args: "indexer",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      env: { NODE_ENV: "production" },
    },
    {
      name: "hive-swarm",
      // The requester + worker agents. Give the chain/indexer a head start.
      script: "pnpm",
      args: "swarm",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 5000,
      env: { NODE_ENV: "production" },
    },
  ],
};
