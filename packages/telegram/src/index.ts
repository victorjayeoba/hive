// Hive Telegram bot — the human front-door to the on-chain agent toolkit.
// Anyone can message the bot to analyze wallets, explain transactions, or check
// the live market — the same tools Hive's worker agents use. No wallet, no
// dashboard, no agent framework needed: just chat.
//
// Run: HIVE_TELEGRAM_TOKEN=... pnpm --filter @hive/telegram start

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import {
  assessWalletRisk,
  decodeTransaction,
  getWalletOverview,
  getWalletHistory,
  traceMoneyFlow,
  getChainStats,
} from "@hive/mcp-tools/tools";
import { getMarketStats, getTaskStatus, postTask } from "@hive/mcp-tools/market";
import { publishTask, getContent } from "@hive/mcp-tools/content";

// Load the repo-root .env (walking up) so HIVE_TELEGRAM_TOKEN + the requester key
// are available when PM2 starts this without an inline env.
(function loadRootEnv() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) {
      loadEnv({ path: candidate });
      return;
    }
    dir = dirname(dir);
  }
})();

const token = process.env.HIVE_TELEGRAM_TOKEN;
if (!token) {
  console.error("HIVE_TELEGRAM_TOKEN not set — get one from @BotFather and set it.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const ADDR = /0x[a-fA-F0-9]{40}/;
const TXH = /0x[a-fA-F0-9]{64}/;

// Log the endpoints the bot will reach, so misconfig is obvious in the logs.
console.log(
  `[telegram] indexer=${process.env.HIVE_INDEXER_HTTP ?? "(default tunnel)"} ` +
    `rpc=${process.env.RPC_URL ?? "(default)"} ` +
    `market=${process.env.HIVE_MARKET_ADDRESS ?? "(default)"}`,
);

const HELP = [
  "🐝 *Hive* — on-chain agent toolkit, in chat.",
  "",
  "*Quick tools* (instant):",
  "*/risk* `0x…wallet` — risk score + findings",
  "*/analyze* `0x…wallet` — full wallet overview",
  "*/explain* `0x…txhash` — decode a transaction",
  "*/trace* `0x…wallet` — trace money flow",
  "*/stats* — live Hive market · */chain* — BOT Chain stats",
  "",
  "*Hire the market* (agents compete):",
  "*/hire* `<what you want done>` — posts a task on-chain; worker",
  "agents bid, do the work, and settle. Watch it on the dashboard.",
  "",
  "The same tools Hive's worker agents use — powered by BOT Chain.",
].join("\n");

const md = { parse_mode: "Markdown" as const, disable_web_page_preview: true };

// Run a handler; on error, LOG the full detail to the console (PM2 logs) and show
// a useful message in chat. `fetch failed` from Node hides the real cause in
// e.cause — surface it so we can actually debug.
async function run(chatId: number, fn: () => Promise<string>) {
  const thinking = await bot.sendMessage(chatId, "⏳ working…");
  try {
    const text = await fn();
    await bot.editMessageText(text, { chat_id: chatId, message_id: thinking.message_id, ...md });
  } catch (e) {
    const err = e as Error & { cause?: unknown };
    // Node's fetch wraps the real reason (ECONNREFUSED, ENOTFOUND, timeout) in .cause
    const cause = err.cause instanceof Error ? err.cause.message : String(err.cause ?? "");
    const detail = [err.message, cause].filter(Boolean).join(" — ");
    console.error(`[telegram] command failed: ${detail}`);
    console.error(err.stack ?? err);
    await bot.editMessageText(`⚠️ ${detail || "something went wrong"}`, {
      chat_id: chatId,
      message_id: thinking.message_id,
    });
  }
}

bot.onText(/^\/(start|help)/, (msg) => bot.sendMessage(msg.chat.id, HELP, md));

bot.onText(/^\/risk(?:\s+(.+))?/, (msg, m) => {
  const addr = m?.[1]?.match(ADDR)?.[0];
  if (!addr) return bot.sendMessage(msg.chat.id, "Usage: `/risk 0x…wallet`", md);
  run(msg.chat.id, async () => {
    const r = await assessWalletRisk(addr);
    const emoji = r.level === "high" ? "🔴" : r.level === "medium" ? "🟡" : "🟢";
    return [
      `${emoji} *Risk: ${r.level.toUpperCase()}* — ${r.score}/100`,
      `\`${addr}\``,
      `Balance: ${r.balance}${r.isContract ? " · contract" : ""}`,
      "",
      ...r.findings.map((f) => `• ${f}`),
      "",
      `[View on explorer](${r.explorer})`,
    ].join("\n");
  });
});

bot.onText(/^\/analyze(?:\s+(.+))?/, (msg, m) => {
  const addr = m?.[1]?.match(ADDR)?.[0];
  if (!addr) return bot.sendMessage(msg.chat.id, "Usage: `/analyze 0x…wallet`", md);
  run(msg.chat.id, async () => {
    const [o, h] = await Promise.all([getWalletOverview(addr), getWalletHistory(addr, 5)]);
    return [
      `📊 *Wallet* \`${addr}\``,
      `Balance: ${o.balance}`,
      `Type: ${o.isContract ? "contract" : "wallet"}${o.isVerified ? " (verified)" : ""}`,
      o.isScam ? "⚠️ *FLAGGED AS SCAM*" : "Scam flag: none",
      o.tags.length ? `Tags: ${o.tags.join(", ")}` : "",
      "",
      `*Recent activity* (${h.length}):`,
      ...h.map((t) => `• ${t.method ?? "transfer"} → ${t.result} (${t.value})`),
      "",
      `[Explorer](${o.explorer})`,
    ].filter(Boolean).join("\n");
  });
});

bot.onText(/^\/explain(?:\s+(.+))?/, (msg, m) => {
  const hash = m?.[1]?.match(TXH)?.[0];
  if (!hash) return bot.sendMessage(msg.chat.id, "Usage: `/explain 0x…txhash`", md);
  run(msg.chat.id, async () => {
    const d = await decodeTransaction(hash);
    return [
      `🔍 *Transaction* \`${hash.slice(0, 18)}…\``,
      `Status: ${d.status}`,
      `Method: ${d.decodedCall ?? d.method ?? "(raw transfer)"}`,
      `Value: ${d.value}${d.fee ? ` · fee ${d.fee}` : ""}`,
      d.params.length ? `\nParams:\n${d.params.map((p) => `• ${p.name}: ${p.value}`).join("\n")}` : "",
      "",
      `[Explorer](${d.explorer})`,
    ].filter(Boolean).join("\n");
  });
});

bot.onText(/^\/trace(?:\s+(.+))?/, (msg, m) => {
  const addr = m?.[1]?.match(ADDR)?.[0];
  if (!addr) return bot.sendMessage(msg.chat.id, "Usage: `/trace 0x…wallet`", md);
  run(msg.chat.id, async () => {
    const edges = await traceMoneyFlow(addr, 10);
    if (edges.length === 0) return `No internal value flow found for \`${addr}\`.`;
    return [
      `💸 *Money flow* \`${addr.slice(0, 10)}…\``,
      "",
      ...edges.map((e) => `• ${e.value}: ${e.from.slice(0, 8)}… → ${e.to.slice(0, 8)}…${e.error ? " ⚠️" : ""}`),
    ].join("\n");
  });
});

bot.onText(/^\/stats/, (msg) => {
  run(msg.chat.id, async () => {
    const s = await getMarketStats();
    return [
      "🐝 *Hive market* — live",
      `Tasks: ${s.tasks} · Bids: ${s.bids} · Txns: ${s.txs}`,
      `Settled: ${s.settledCount} · Active agents: ${s.activeAgents}`,
      "",
      "Agents hiring agents, settling on-chain every block.",
    ].join("\n");
  });
});

bot.onText(/^\/chain/, (msg) => {
  run(msg.chat.id, async () => {
    const s = await getChainStats();
    return [
      "⛓️ *BOT Chain* — live",
      `Avg block time: *${(s.avgBlockTimeMs / 1000).toFixed(2)}s*`,
      s.coinPrice ? `BOT price: $${Number(s.coinPrice).toFixed(2)}` : "",
      s.gasPrices ? `Gas: ${s.gasPrices.average ?? s.gasPrices.slow} gwei (near-zero cost)` : "",
      s.totalTransactions ? `Total txns: ${Number(s.totalTransactions).toLocaleString()}` : "",
      "",
      "Sub-second blocks + near-zero fees — what makes an on-chain agent market possible.",
    ].filter(Boolean).join("\n");
  });
});

// --- /hire: post a REAL task to the market and let worker agents fulfill it ---
// This is the loop: human demand → agents compete on-chain → result delivered.
bot.onText(/^\/hire(?:\s+([\s\S]+))?/, (msg, m) => {
  const chatId = msg.chat.id;
  const request = m?.[1]?.trim();
  if (!request) {
    return bot.sendMessage(
      chatId,
      "Usage: `/hire <what you want done>`\nExample: `/hire analyze wallet 0x31fc3688295309a2a08627ddd1d65deeee85c201`",
      md,
    );
  }

  // Route the request into a task spec. Wallet/tx in the text → on-chain task.
  const addr = request.match(ADDR)?.[0];
  const tx = request.match(TXH)?.[0];
  const spec = tx
    ? { kind: "explain-tx", prompt: "Explain in plain English what this BOT Chain transaction did.", input: tx }
    : addr
      ? { kind: "analyze-wallet", prompt: "Analyze this BOT Chain wallet and give a plain-English risk assessment.", input: addr }
      : { kind: "summarize", prompt: "Complete this request concisely.", input: request };

  run(chatId, async () => {
    // 1. publish content to the indexer, 2. post the task on-chain
    const { specHash, inputHash } = await publishTask(spec);
    const posted = await postTask({ specHash, inputHash });
    if ("error" in posted) return `⚠️ Couldn't post the task: ${posted.error}`;

    await bot.sendMessage(
      chatId,
      `📤 *Task posted to the Hive market.*\nWorker agents are bidding now — watch it live on the dashboard.\n[Posted tx](${posted.explorer})`,
      md,
    );

    // 3. poll the market for THIS task (matched by specHash) until settled
    const result = await pollForResult(specHash, 90_000);
    return result ?? "⏳ The task is live on-chain, but no worker has settled it yet. Track it on the dashboard.";
  });
});

/** Poll the market snapshot for the settled task with this specHash, then fetch its result. */
async function pollForResult(specHash: string, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const snap = await fetchSnapshot();
      const t = (snap.tasks ?? []).find(
        (x: any) => x.spec_hash === specHash && x.status === 5 && x.result_hash,
      );
      if (t?.result_hash) {
        const result = await getContent<string>(t.result_hash);
        if (result) return `✅ *Result*\n\n${result}\n\n[Settled on-chain](${t.settledUrl ?? ""})`;
      }
    } catch {
      /* keep polling */
    }
  }
  return null;
}

async function fetchSnapshot(): Promise<any> {
  const base = process.env.HIVE_INDEXER_HTTP ?? "http://localhost:4000";
  const res = await fetch(`${base}/snapshot`);
  return res.json();
}

console.log("[telegram] Hive bot up — polling");
