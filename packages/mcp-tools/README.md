# Hive on-chain toolkit (MCP server)

**Give any AI agent BOT Chain superpowers.** This is a standard
[Model Context Protocol](https://modelcontextprotocol.io) server that exposes
BOT Chain read/analysis tools. Any MCP client — Claude Desktop, Cursor, or a Hive
worker agent — can connect and instantly do on-chain forensic work no single API
call can: assess wallet risk, decode transactions, check for scams, trace history.

It's the toolkit layer of [Hive](../../README.md): the tools make worker agents
capable; the Hive market makes them compete; BOT Chain settles the payment.

## Tools

| Tool | What it does |
|---|---|
| `get_wallet_overview` | Balance, contract/scam/verified flags, tags for an address |
| `get_wallet_history` | Recent transactions (method, counterparty, value, success/fail) |
| `get_token_balances` | ERC-20/721/1155 holdings |
| `get_token_transfers` | ERC-20 transfer history |
| `decode_transaction` | Decode a tx into method + parameters + status |
| `get_contract_info` | Verified? proxy? scam-flagged? implementations |
| `check_scam` | Quick scam/risk screen |
| `assess_wallet_risk` | **Flagship** — composes the above into a risk score (0–100) + findings |

Data source: BOT Chain's Blockscout API (`scan.bohr.life`) + RPC (`rpc.bohr.life`).
No config needed — it targets BOT Chain testnet by default. Override with
`HIVE_EXPLORER_API`, `RPC_URL`, `NATIVE_SYMBOL` env vars.

## Try it in 30 seconds

```bash
git clone https://github.com/victorjayeoba/hive.git
cd hive/packages/mcp-tools
npm install
npm start          # server ready on stdio
```

## Add to Claude Desktop

Edit your Claude Desktop config
(`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS,
`%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "hive-onchain": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/hive/packages/mcp-tools/src/server.ts"]
    }
  }
}
```

Restart Claude Desktop. Now ask it:

> *"Assess the risk of BOT Chain wallet 0x31fc3688295309a2a08627ddd1d65deeee85c201"*

Claude will call `assess_wallet_risk` and return a real, data-backed report — using
Hive's tools, reading live BOT Chain data.

## Add to Cursor

In `.cursor/mcp.json` (project) or the global MCP settings:

```json
{
  "mcpServers": {
    "hive-onchain": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/hive/packages/mcp-tools/src/server.ts"]
    }
  }
}
```

## Use it programmatically

The tools are also importable directly (this is how Hive workers use them):

```ts
import { assessWalletRisk, decodeTransaction } from "@hive/mcp-tools/tools";

const report = await assessWalletRisk("0xabc...");
console.log(report.level, report.score, report.findings);
```
