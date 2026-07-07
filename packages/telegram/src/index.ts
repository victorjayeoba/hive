// Hive Telegram bot — the human front-door to the on-chain agent toolkit.
// Anyone can message the bot to analyze wallets, explain transactions, or check
// the live market — the same tools Hive's worker agents use. No wallet, no
// dashboard, no agent framework needed: just chat.
//
// Run: HIVE_TELEGRAM_TOKEN=... pnpm --filter @hive/telegram start

import TelegramBot from "node-telegram-bot-api";
import {
  assessWalletRisk,
  decodeTransaction,
  getWalletOverview,
  getWalletHistory,
  traceMoneyFlow,
  getChainStats,
} from "@hive/mcp-tools/tools";
import { getMarketStats } from "@hive/mcp-tools/market";

const token = process.env.HIVE_TELEGRAM_TOKEN;
if (!token) {
  console.error("HIVE_TELEGRAM_TOKEN not set — get one from @BotFather and set it.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const ADDR = /0x[a-fA-F0-9]{40}/;
const TXH = /0x[a-fA-F0-9]{64}/;

const HELP = [
  "🐝 *Hive* — on-chain agent toolkit, in chat.",
  "",
  "*/risk* `0x…wallet` — risk score + findings",
  "*/analyze* `0x…wallet` — full wallet overview",
  "*/explain* `0x…txhash` — decode a transaction",
  "*/trace* `0x…wallet` — trace money flow",
  "*/stats* — live Hive market activity",
  "*/chain* — BOT Chain network stats",
  "",
  "The same tools Hive's worker agents use — powered by BOT Chain.",
].join("\n");

const md = { parse_mode: "Markdown" as const, disable_web_page_preview: true };

// small helper: run a handler, catch errors into a friendly message
async function run(chatId: number, fn: () => Promise<string>) {
  const thinking = await bot.sendMessage(chatId, "⏳ working…");
  try {
    const text = await fn();
    await bot.editMessageText(text, { chat_id: chatId, message_id: thinking.message_id, ...md });
  } catch (e) {
    await bot.editMessageText(`⚠️ ${(e as Error).message}`, {
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

console.log("[telegram] Hive bot up — polling");
