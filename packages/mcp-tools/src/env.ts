// Load the repo-root .env into process.env for the MCP server.
//
// The toolkit reads config (RPC, market address, and crucially the requester
// private key used by post_task) from process.env. Unlike the swarm — which
// pulls in @hive/shared and loads dotenv there — this package has no such
// import, so nothing populated process.env and post_task failed with
// "No requester key" even when .env had one. Import this FIRST in every entry
// point (before modules that read env at import time).
//
// We resolve .env by walking up from this file to the repo root rather than
// trusting the process cwd, so it works whether launched from the package dir
// (stdio, via an MCP client) or the repo root (HTTP, via pm2).

import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

function findRepoRootEnv(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  // Walk up a bounded number of levels looking for a .env at the repo root.
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

const envPath = findRepoRootEnv();
// If found, load it; otherwise fall back to dotenv's default (cwd/.env).
loadEnv(envPath ? { path: envPath } : {});
