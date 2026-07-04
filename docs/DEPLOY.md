# Deploying the Hive backend on a VPS

The frontend (dashboard) lives on Vercel. The **backend** — the indexer and the
agent swarm — runs on a VPS and talks to **BOT Chain testnet**. This guide takes
you from a fresh VPS to a live backend the Vercel dashboard can connect to.

Architecture:

```
Vercel (dashboard)  ──HTTPS/WSS──►  nginx  ──►  indexer :4000  ──►  BOT Chain testnet
                                                    ▲
                                              agent swarm (requester + 3 workers)
```

Three backend pieces:

- **Contracts** — HiveMarket + Reputation. Compiled with Foundry, deployed **once** (viem script).
- **Indexer** — chain events → SQLite → `GET /snapshot` + WebSocket on `:4000`. Long-running.
- **Swarm** — 1 requester + 3 worker agents, running the market. Long-running.

Both long-running services are managed by **PM2**.

---

## 0. Before you start — get the BOT Chain testnet values

Look these up at `dev-docs.botchain.ai` / `scan.botchain.ai` (do **not** guess):

- `RPC_URL` — the testnet RPC endpoint
- `CHAIN_ID` — the numeric chain id
- `NATIVE_SYMBOL` — the gas token symbol
- `EXPLORER_BASE` — e.g. `https://scan.botchain.ai`
- `BLOCK_TIME_MS` — ~750 per the PRD
- Faucet URL — to fund the 4 agent wallets (`faucet.botchain.ai`)

You also need an `OPENAI_API_KEY` for real worker LLM calls.

---

## 1. VPS prep (Ubuntu assumed)

```bash
# Node 20+ — use nvm (avoids Ubuntu shipping an old Node 18 without npm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20 && nvm use 20
node -v      # MUST be v20.x (node:sqlite in the indexer needs 20+)

# pnpm + pm2
npm i -g pnpm pm2

# Foundry — needed to COMPILE the contracts (the deploy reads the forge artifact)
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc && foundryup
forge --version

# clone + install
git clone https://github.com/victorjayeoba/hive.git
cd hive
pnpm install
```

---

## 2. Configure .env

```bash
cp .env.example .env
nano .env
```

Fill in:

```ini
# --- Chain (BOT Chain testnet — from their docs) ---
RPC_URL=<botchain testnet rpc>
CHAIN_ID=<chain id>
NATIVE_SYMBOL=<symbol>
EXPLORER_BASE=https://scan.botchain.ai
BLOCK_TIME_MS=750

# --- Keys (fund these from the faucet; use FRESH keys, not the Anvil defaults) ---
REQUESTER_PRIVATE_KEY=0x...
WORKER_1_PRIVATE_KEY=0x...
WORKER_2_PRIVATE_KEY=0x...
WORKER_3_PRIVATE_KEY=0x...

# --- LLM ---
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini

# --- Indexer ---
INDEXER_PORT=4000

# HIVE_MARKET_ADDRESS + DEPLOY_BLOCK are filled by the deploy step below.
```

> **Generate fresh keys**, don't reuse the Anvil defaults in `.env.example`
> (those are publicly known). Fund each of the 4 addresses from the faucet.

---

## 3. Deploy the contracts (once)

```bash
pnpm --filter @hive/shared build   # compile shared ABIs/types
pnpm deploy:local                  # compiles HiveMarket (forge) then deploys to RPC_URL
```

> `deploy:local` runs `forge build --skip test` first, so Foundry must be
> installed (step 1). `--skip test` avoids needing `forge-std` (only the test
> file uses it; the contracts themselves have no external deps).

This deploys HiveMarket and **writes `HIVE_MARKET_ADDRESS` + `DEPLOY_BLOCK` back
into `.env`** automatically. Confirm the address printed matches `.env`.

---

## 4. Start the backend with PM2

```bash
pm2 start ecosystem.config.cjs     # starts hive-indexer + hive-swarm
pm2 status                         # both should be "online"
pm2 logs                           # watch tasks post / bids land / settle
pm2 save                           # remember these processes
pm2 startup                        # print a command to run so PM2 survives reboots
```

Quick local check on the VPS:

```bash
curl http://localhost:4000/health     # -> ok
curl http://localhost:4000/snapshot   # -> JSON with tasks/agents/counters
```

Useful later: `pm2 restart hive-indexer`, `pm2 stop hive-swarm`, `pm2 logs hive-swarm`.

---

## 5. Expose :4000 over HTTPS/WSS (required)

The Vercel dashboard is HTTPS, so browsers **block** a plain `ws://` or `http://`
connection to it. You must serve the indexer over **HTTPS + WSS**. Put nginx in
front with a Let's Encrypt cert.

Point a subdomain (e.g. `api.yourdomain.com`) at the VPS, then:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/hive`:

```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        # WebSocket upgrade — required for the live snapshot stream
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hive /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com   # issues the HTTPS cert + WSS
```

Verify from anywhere:

```bash
curl https://api.yourdomain.com/health   # -> ok
```

> No domain? A quick alternative for testing is a Cloudflare Tunnel or ngrok,
> which give you an HTTPS/WSS URL without nginx — but a real subdomain + cert is
> the stable answer for the demo.

---

## 6. Wire the Vercel dashboard to the VPS

In **Vercel → Settings → Environment Variables**, add:

```
NEXT_PUBLIC_INDEXER_HTTP = https://api.yourdomain.com
NEXT_PUBLIC_INDEXER_WS   = wss://api.yourdomain.com
```

Redeploy the dashboard. `/app` will connect, drop the "Connecting to the live
market…" state, and stream live tasks/bids/settlements from the VPS.

Also set the chain vars the dashboard's `/api/post-task` route needs at runtime:
`RPC_URL`, `CHAIN_ID`, `HIVE_MARKET_ADDRESS`, `EXPLORER_BASE`, `REQUESTER_PRIVATE_KEY`.

---

## Recap / cheatsheet

```bash
# one-time
pnpm install
cp .env.example .env && nano .env
pnpm --filter @hive/shared build
pnpm deploy:local            # deploys contracts, writes address to .env

# run
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup

# expose (nginx + certbot for HTTPS/WSS on api.yourdomain.com)
# then set NEXT_PUBLIC_INDEXER_HTTP/WS in Vercel and redeploy
```

## Troubleshooting

- **Dashboard stuck on "Connecting…"** → the indexer isn't reachable over WSS.
  Check `curl https://api.yourdomain.com/health`, and that Vercel's
  `NEXT_PUBLIC_INDEXER_WS` uses `wss://` (not `ws://`).
- **Swarm not posting** → check `pm2 logs hive-swarm`; usually unfunded keys or a
  wrong `HIVE_MARKET_ADDRESS`. Re-run the deploy step and confirm `.env`.
- **`node:sqlite` error** → needs Node 20+ with the `--experimental-sqlite` flag,
  which the PM2 config already passes.
- **Mixed-content / CORS in browser console** → you're on `ws://`/`http://` from an
  HTTPS page. Must be `wss://`/`https://` (step 5).
```
