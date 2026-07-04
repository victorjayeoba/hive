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
      // Uses Node's built-in node:sqlite (stable in Node 22.5+); tsx runs the TS.
      // No --experimental-sqlite flag: it's unrecognized on some Node builds and
      // unnecessary on 22.5+. Requires Node 22+.
      script: "node",
      args: "--disable-warning=ExperimentalWarning --import tsx packages/indexer/src/index.ts",
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
