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
      // Node's built-in SQLite needs the experimental flag; tsx runs the TS directly.
      script: "node",
      args: "--experimental-sqlite --disable-warning=ExperimentalWarning --import tsx packages/indexer/src/index.ts",
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
