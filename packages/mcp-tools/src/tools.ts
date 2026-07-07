// Hive on-chain toolkit — the tools worker agents (or any MCP client) use to do
// real BOT Chain work. Each returns structured data; the flagship assessWalletRisk
// composes them into a report. Read-only (Tier 1/2); no signing.

import {
  bs,
  rpc,
  fmtNative,
  short,
  explorerAddr,
  explorerTx,
  nativeSymbol,
  marketAddress,
  reputationAddress,
  type AddressInfo,
  type TxItem,
  type TokenBalance,
  type TokenTransferItem,
  type BalanceHistoryItem,
  type TokenHolderItem,
  type TokenInfo,
  type BlockItem,
  type Address,
  type Hex,
} from "./chain.js";
import { decodeHiveCall, isKnownContract } from "./abi-decode.js";
import { formatEther, parseAbi } from "viem";

// --- getWalletOverview -----------------------------------------------------

export interface WalletOverview {
  address: string;
  balance: string;
  isContract: boolean;
  isScam: boolean;
  isVerified: boolean;
  hasTokens: boolean;
  tags: string[];
  name: string | null;
  explorer: string;
}

/** Snapshot of an address: balance, contract/scam/verified flags, tags. */
export async function getWalletOverview(address: string): Promise<WalletOverview> {
  const a = await bs<AddressInfo>(`/addresses/${address}`);
  return {
    address: a.hash,
    balance: fmtNative(a.coin_balance),
    isContract: a.is_contract,
    isScam: a.is_scam,
    isVerified: a.is_verified,
    hasTokens: a.has_tokens,
    tags: [...a.public_tags, ...a.private_tags, ...a.watchlist_names].filter(Boolean),
    name: a.name,
    explorer: explorerAddr(a.hash),
  };
}

// --- getWalletHistory ------------------------------------------------------

export interface HistoryEntry {
  hash: string;
  method: string | null;
  result: string;
  from: string;
  to: string | null;
  value: string;
  toIsScam: boolean;
  toIsContract: boolean;
  timestamp: string | null;
  explorer: string;
}

/** Recent transactions for an address (most recent first, capped). */
export async function getWalletHistory(address: string, limit = 15): Promise<HistoryEntry[]> {
  const data = await bs<{ items: TxItem[] }>(`/addresses/${address}/transactions`);
  return (data.items ?? []).slice(0, limit).map((t) => ({
    hash: t.hash,
    method: t.method,
    result: t.result,
    from: t.from.hash,
    to: t.to?.hash ?? null,
    value: fmtNative(t.value),
    toIsScam: Boolean(t.to?.is_scam),
    toIsContract: Boolean(t.to?.is_contract),
    timestamp: t.timestamp,
    explorer: explorerTx(t.hash),
  }));
}

// --- getTokenBalances ------------------------------------------------------

export interface TokenHolding {
  symbol: string | null;
  name: string | null;
  address: string;
  amount: string;
  type: string;
}

/** ERC-20/721/1155 holdings of an address. */
export async function getTokenBalances(address: string): Promise<TokenHolding[]> {
  const list = await bs<TokenBalance[]>(`/addresses/${address}/token-balances`);
  return (list ?? []).map((b) => {
    const dec = b.token.decimals ? Number(b.token.decimals) : 0;
    const amount = dec > 0 ? (Number(b.value) / 10 ** dec).toString() : b.value;
    return {
      symbol: b.token.symbol,
      name: b.token.name,
      address: b.token.address,
      amount,
      type: b.token.type,
    };
  });
}

// --- getTokenTransfers -----------------------------------------------------

export interface TransferEntry {
  from: string;
  to: string;
  token: string | null;
  amount: string;
  txHash: string;
  timestamp: string | null;
}

/** ERC-20 transfer history for an address. */
export async function getTokenTransfers(address: string, limit = 15): Promise<TransferEntry[]> {
  const data = await bs<{ items: TokenTransferItem[] }>(
    `/addresses/${address}/token-transfers`,
  );
  return (data.items ?? []).slice(0, limit).map((t) => {
    const dec = t.total.decimals ? Number(t.total.decimals) : 0;
    const amount = dec > 0 ? (Number(t.total.value) / 10 ** dec).toString() : t.total.value;
    return {
      from: t.from.hash,
      to: t.to.hash,
      token: t.token.symbol,
      amount,
      txHash: t.tx_hash,
      timestamp: t.timestamp,
    };
  });
}

// --- decodeTransaction -----------------------------------------------------

export interface DecodedTx {
  hash: string;
  status: string;
  from: string;
  to: string | null;
  toName: string | null;
  value: string;
  method: string | null;
  decodedCall: string | null;
  params: { name: string; type: string; value: string }[];
  fee: string | null;
  explorer: string;
}

/** Decode a transaction into a readable form (method + parameters). */
export async function decodeTransaction(hash: string): Promise<DecodedTx> {
  const t = await bs<TxItem>(`/transactions/${hash}`);

  let decodedCall = t.decoded_input?.method_call ?? null;
  let params =
    t.decoded_input?.parameters.map((p) => ({
      name: p.name,
      type: p.type,
      value: String(p.value),
    })) ?? [];

  // The explorer can't decode UNVERIFIED contracts — it returns a bare selector
  // like `0xb8adaa11`. If the target is a contract we hold the ABI for
  // (HiveMarket), decode it ourselves so the user sees `reject(taskId: 15)`
  // instead of hex. This is the /explain payoff on our own on-chain activity.
  if (!decodedCall && isKnownContract(t.to?.hash)) {
    const local = decodeHiveCall(t.raw_input);
    if (local) {
      decodedCall = local.call;
      params = local.params;
    }
  }

  return {
    hash: t.hash,
    status: t.result,
    from: t.from.hash,
    to: t.to?.hash ?? null,
    toName: t.to?.name ?? null,
    value: fmtNative(t.value),
    method: t.method,
    decodedCall,
    params,
    fee: t.fee ? fmtNative(t.fee.value) : null,
    explorer: explorerTx(t.hash),
  };
}

// --- getContractInfo -------------------------------------------------------

export interface ContractInfo {
  address: string;
  isContract: boolean;
  isVerified: boolean;
  isScam: boolean;
  isProxy: boolean;
  implementations: string[];
  name: string | null;
  explorer: string;
}

/** Contract metadata: verified? proxy? scam-flagged? */
export async function getContractInfo(address: string): Promise<ContractInfo> {
  const a = await bs<AddressInfo>(`/addresses/${address}`);
  return {
    address: a.hash,
    isContract: a.is_contract,
    isVerified: a.is_verified,
    isScam: a.is_scam,
    isProxy: a.implementations.length > 0,
    implementations: a.implementations.map((i) => i.address),
    name: a.name,
    explorer: explorerAddr(a.hash),
  };
}

// --- checkScam -------------------------------------------------------------

export interface ScamCheck {
  address: string;
  flaggedScam: boolean;
  reasons: string[];
}

/** Quick scam/risk screen using Blockscout's flags + simple heuristics. */
export async function checkScam(address: string): Promise<ScamCheck> {
  const a = await bs<AddressInfo>(`/addresses/${address}`);
  const reasons: string[] = [];
  if (a.is_scam) reasons.push("Explorer has flagged this address as a scam.");
  if (a.is_contract && !a.is_verified) reasons.push("Unverified contract — source not published.");
  if (a.watchlist_names.length) reasons.push(`On watchlists: ${a.watchlist_names.join(", ")}`);
  return { address: a.hash, flaggedScam: a.is_scam, reasons };
}

// --- assessWalletRisk (flagship, composed) ---------------------------------

export interface RiskReport {
  address: string;
  score: number; // 0 (safe) – 100 (dangerous)
  level: "low" | "medium" | "high";
  balance: string;
  isContract: boolean;
  findings: string[];
  recentActivity: { count: number; interactedWithScam: boolean; failedTxs: number };
  explorer: string;
}

/**
 * Flagship analysis: pull an address's overview + recent history, compute a risk
 * score and human-readable findings. This is what a worker returns for an
 * "analyze wallet" task — real synthesis no single API call gives you.
 */
export async function assessWalletRisk(address: string): Promise<RiskReport> {
  const [overview, history] = await Promise.all([
    getWalletOverview(address),
    getWalletHistory(address, 25).catch(() => [] as HistoryEntry[]),
  ]);

  const findings: string[] = [];
  let score = 0;

  if (overview.isScam) {
    score += 80;
    findings.push("⚠️ Address is flagged as a SCAM by the explorer.");
  }
  if (overview.isContract && !overview.isVerified) {
    score += 25;
    findings.push("Unverified contract — its source code isn't published, so behavior can't be audited.");
  }
  if (overview.tags.length) {
    findings.push(`Tagged: ${overview.tags.join(", ")}.`);
  }

  const interactedWithScam = history.some((h) => h.toIsScam);
  const failedTxs = history.filter((h) => h.result !== "success").length;
  if (interactedWithScam) {
    score += 30;
    findings.push("Has interacted with one or more scam-flagged addresses.");
  }
  if (failedTxs > 0) {
    score += Math.min(failedTxs * 3, 15);
    findings.push(`${failedTxs} recent transaction(s) failed/reverted.`);
  }
  if (history.length === 0) {
    findings.push("No recent transaction history — a fresh or dormant address.");
  }

  score = Math.min(score, 100);
  const level = score >= 60 ? "high" : score >= 25 ? "medium" : "low";
  if (findings.length === 0) findings.push("No risk signals found in the checks performed.");

  return {
    address: overview.address,
    score,
    level,
    balance: overview.balance,
    isContract: overview.isContract,
    findings,
    recentActivity: { count: history.length, interactedWithScam, failedTxs },
    explorer: overview.explorer,
  };
}

// --- getChainStats ---------------------------------------------------------

export interface ChainStats {
  avgBlockTimeMs: number;
  coinPrice: string | null;
  gasPrices: { slow?: number; average?: number; fast?: number } | null;
  totalBlocks: string | null;
  totalTransactions: string | null;
  totalAddresses: string | null;
}

/** BOT Chain network stats — proves the sub-second / low-fee thesis with live data. */
export async function getChainStats(): Promise<ChainStats> {
  const s = await bs<{
    average_block_time: number;
    coin_price: string | null;
    gas_prices: { slow?: number; average?: number; fast?: number } | null;
    total_blocks: string | null;
    total_transactions: string | null;
    total_addresses: string | null;
  }>(`/stats`);
  return {
    avgBlockTimeMs: s.average_block_time,
    coinPrice: s.coin_price,
    gasPrices: s.gas_prices,
    totalBlocks: s.total_blocks,
    totalTransactions: s.total_transactions,
    totalAddresses: s.total_addresses,
  };
}

// --- getAddressActivity ----------------------------------------------------

export interface AddressActivity {
  address: string;
  transactionsCount: number;
  tokenTransfersCount: number;
  gasUsed: string;
}

/** Activity counters for an address — how busy/established it is. */
export async function getAddressActivity(address: string): Promise<AddressActivity> {
  const c = await bs<{
    transactions_count: string;
    token_transfers_count: string;
    gas_usage_count: string;
  }>(`/addresses/${address}/counters`);
  return {
    address,
    transactionsCount: Number(c.transactions_count),
    tokenTransfersCount: Number(c.token_transfers_count),
    gasUsed: c.gas_usage_count,
  };
}

// --- traceMoneyFlow --------------------------------------------------------

export interface FlowEdge {
  from: string;
  to: string;
  value: string;
  block: number;
  error: string | null;
}

/**
 * Trace value moving in/out of an address via internal transactions (contract
 * calls that forward funds). Forensic view of where money actually went — not
 * something a single API call reveals.
 */
export async function traceMoneyFlow(address: string, limit = 15): Promise<FlowEdge[]> {
  const data = await bs<{
    items: {
      from: { hash: string };
      to: { hash: string } | null;
      value: string;
      block_number: number;
      error: string | null;
    }[];
  }>(`/addresses/${address}/internal-transactions`);
  return (data.items ?? []).slice(0, limit).map((i) => ({
    from: i.from.hash,
    to: i.to?.hash ?? "(contract creation)",
    value: fmtNative(i.value),
    block: i.block_number,
    error: i.error,
  }));
}

// --- detectDrain (balance history) -----------------------------------------

export interface DrainReport {
  address: string;
  currentBalance: string;
  peakBalance: string;
  points: number;
  maxDropPct: number; // biggest single-step % drop
  drained: boolean; // lost >=70% from its peak
  verdict: string;
  history: { block: number; timestamp: string; balance: string; delta: string }[];
  explorer: string;
}

/**
 * Look at an address's balance OVER TIME (not just now) and flag drains —
 * a wallet that lost most of its balance fast. Explorers show the number;
 * this shows the *trajectory*, which is the actual risk signal.
 */
export async function detectDrain(address: string): Promise<DrainReport> {
  const data = await bs<{ items: BalanceHistoryItem[] }>(
    `/addresses/${address}/coin-balance-history`,
  );
  const items = (data.items ?? []).slice().reverse(); // oldest → newest

  let peak = 0n;
  let maxDropPct = 0;
  let prev: bigint | null = null;
  for (const it of items) {
    const v = safeBigWei(it.value);
    if (v > peak) peak = v;
    if (prev !== null && prev > 0n && v < prev) {
      const dropPct = Number(((prev - v) * 100n) / prev);
      if (dropPct > maxDropPct) maxDropPct = dropPct;
    }
    prev = v;
  }

  const current = items.length ? safeBigWei(items[items.length - 1].value) : 0n;
  const fromPeakPct = peak > 0n ? Number(((peak - current) * 100n) / peak) : 0;
  const drained = fromPeakPct >= 70 && peak > 0n;

  const verdict = drained
    ? `⚠️ Drained — down ${fromPeakPct}% from its peak of ${fmtNative(peak)}. Classic drain/exit pattern.`
    : maxDropPct >= 50
      ? `A single ${maxDropPct}% drop occurred, but the balance recovered or held. Watch it.`
      : peak === 0n
        ? "No balance movement recorded — dormant or fresh address."
        : `Stable — current ${fmtNative(current)} vs peak ${fmtNative(peak)} (${fromPeakPct}% below peak).`;

  return {
    address,
    currentBalance: fmtNative(current),
    peakBalance: fmtNative(peak),
    points: items.length,
    maxDropPct,
    drained,
    verdict,
    history: items.slice(-8).map((it) => ({
      block: it.block_number,
      timestamp: it.block_timestamp,
      balance: fmtNative(it.value),
      delta: `${it.delta.startsWith("-") ? "" : "+"}${fmtNative(it.delta.replace("-", ""))}`,
    })),
    explorer: explorerAddr(address),
  };
}

// --- analyzeToken (holder concentration / rug risk) ------------------------

export interface TokenRiskReport {
  token: string;
  name: string | null;
  symbol: string | null;
  holders: number | null;
  topHolderPct: number;
  top5Pct: number;
  scamHolders: number;
  concentrationRisk: "high" | "medium" | "low";
  verdict: string;
  topHolders: { address: string; pct: number; isScam: boolean }[];
  explorer: string;
}

/**
 * Assess a token's holder concentration — the core rug-pull signal. If a handful
 * of wallets hold most of the supply, one sell tanks it. Also flags scam-tagged
 * holders. Not something a single balance lookup tells you.
 */
export async function analyzeToken(tokenAddress: string): Promise<TokenRiskReport> {
  const [info, holdersData] = await Promise.all([
    bs<TokenInfo>(`/tokens/${tokenAddress}`).catch(() => null),
    bs<{ items: TokenHolderItem[] }>(`/tokens/${tokenAddress}/holders`),
  ]);
  const holders = holdersData.items ?? [];
  const supply = info?.total_supply ? safeBigWei(info.total_supply) : 0n;

  const pctOf = (v: string) =>
    supply > 0n ? Number((safeBigWei(v) * 10000n) / supply) / 100 : 0;

  const ranked = holders.map((h) => ({
    address: h.address.hash,
    pct: pctOf(h.value),
    isScam: h.address.is_scam,
  }));
  const topHolderPct = ranked[0]?.pct ?? 0;
  const top5Pct = ranked.slice(0, 5).reduce((a, h) => a + h.pct, 0);
  const scamHolders = ranked.filter((h) => h.isScam).length;

  const concentrationRisk = top5Pct >= 80 ? "high" : top5Pct >= 50 ? "medium" : "low";
  const verdict =
    concentrationRisk === "high"
      ? `⚠️ Highly concentrated — top 5 wallets hold ${top5Pct.toFixed(1)}% of supply. One sell could tank it (rug risk).`
      : concentrationRisk === "medium"
        ? `Moderately concentrated — top 5 hold ${top5Pct.toFixed(1)}%. Some centralization risk.`
        : `Reasonably distributed — top 5 hold ${top5Pct.toFixed(1)}%. Lower rug risk.`;

  return {
    token: tokenAddress,
    name: info?.name ?? null,
    symbol: info?.symbol ?? null,
    holders: info?.holders ? Number(info.holders) : null,
    topHolderPct: Number(topHolderPct.toFixed(2)),
    top5Pct: Number(top5Pct.toFixed(2)),
    scamHolders,
    concentrationRisk,
    verdict: scamHolders > 0 ? `${verdict} ${scamHolders} scam-flagged holder(s).` : verdict,
    topHolders: ranked.slice(0, 5).map((h) => ({ ...h, pct: Number(h.pct.toFixed(2)) })),
    explorer: `https://scan.bohr.life/token/${tokenAddress}`,
  };
}

// --- getWorkerReputation (on-chain track record) ---------------------------

const REPUTATION_ABI = parseAbi([
  "function get(address) view returns ((uint64 completed, uint64 timedOut, uint64 disputed, uint64 lastActiveBlock))",
]);

export interface WorkerReputation {
  worker: string;
  completed: number;
  timedOut: number;
  disputed: number;
  reliability: number; // % of jobs completed cleanly
  level: "trusted" | "established" | "new" | "flagged";
  verdict: string;
  explorer: string;
}

/**
 * A worker agent's PERMANENT on-chain reputation — jobs completed, timed out,
 * disputed — read straight from the Reputation contract. This is what makes Hive
 * a market with accountability, not a one-shot API. No off-chain database.
 */
export async function getWorkerReputation(worker: string): Promise<WorkerReputation> {
  const rec = (await rpc.readContract({
    address: reputationAddress(),
    abi: REPUTATION_ABI,
    functionName: "get",
    args: [worker as Address],
  })) as { completed: bigint; timedOut: bigint; disputed: bigint; lastActiveBlock: bigint };

  const completed = Number(rec.completed);
  const timedOut = Number(rec.timedOut);
  const disputed = Number(rec.disputed);
  const total = completed + timedOut + disputed;
  const reliability = total > 0 ? Math.round((completed / total) * 100) : 0;

  const level: WorkerReputation["level"] =
    disputed > 0 || (total > 0 && reliability < 50)
      ? "flagged"
      : completed >= 10 && reliability >= 90
        ? "trusted"
        : completed >= 3
          ? "established"
          : "new";

  const verdict =
    total === 0
      ? "No on-chain job history yet — a brand-new worker."
      : level === "trusted"
        ? `Trusted worker: ${completed} jobs completed at ${reliability}% reliability.`
        : level === "flagged"
          ? `⚠️ ${disputed} disputed / ${timedOut} timed out of ${total} — proceed with caution.`
          : `${completed} completed, ${reliability}% reliability across ${total} jobs.`;

  return {
    worker,
    completed,
    timedOut,
    disputed,
    reliability,
    level,
    verdict,
    explorer: explorerAddr(worker),
  };
}

// --- getNetworkPulse (live chain + market heartbeat) -----------------------

const MARKET_STATE_ABI = parseAbi([
  "function escrowedTotal() view returns (uint256)",
  "function nextTaskId() view returns (uint256)",
]);

export interface NetworkPulse {
  latestBlock: number;
  blockTimestamp: string;
  recentBlocks: { height: number; txs: number; timestamp: string }[];
  avgBlockTimeMs: number;
  tasksPosted: number;
  escrowedTotal: string; // TVL in the market right now
  explorer: string;
}

/**
 * A live heartbeat: the latest blocks ticking by + how much value is escrowed in
 * the Hive market right now (TVL). Proves the sub-second-block thesis visually and
 * shows the market is actually holding real money.
 */
export async function getNetworkPulse(): Promise<NetworkPulse> {
  const [blocksData, escrowed, nextId] = await Promise.all([
    bs<{ items: BlockItem[] }>(`/blocks`),
    rpc.readContract({ address: marketAddress(), abi: MARKET_STATE_ABI, functionName: "escrowedTotal" }),
    rpc.readContract({ address: marketAddress(), abi: MARKET_STATE_ABI, functionName: "nextTaskId" }),
  ]);
  const blocks = (blocksData.items ?? []).slice(0, 6);

  // Estimate block time from the two most recent blocks with timestamps.
  let avgBlockTimeMs = 0;
  if (blocks.length >= 2) {
    const t0 = new Date(blocks[0].timestamp).getTime();
    const t1 = new Date(blocks[blocks.length - 1].timestamp).getTime();
    const span = blocks.length - 1;
    avgBlockTimeMs = span > 0 ? Math.round(Math.abs(t0 - t1) / span) : 0;
  }

  return {
    latestBlock: blocks[0]?.height ?? 0,
    blockTimestamp: blocks[0]?.timestamp ?? "",
    recentBlocks: blocks.map((b) => ({ height: b.height, txs: b.tx_count, timestamp: b.timestamp })),
    avgBlockTimeMs,
    tasksPosted: Number(nextId as bigint) - 1,
    escrowedTotal: fmtNative(escrowed as bigint),
    explorer: "https://scan.bohr.life/blocks",
  };
}

/** Parse a wei string to BigInt, tolerating null/garbage (returns 0n). */
function safeBigWei(v: string | null | undefined): bigint {
  if (!v) return 0n;
  try {
    return BigInt(v);
  } catch {
    return 0n;
  }
}

// --- helpers re-exported for consumers -------------------------------------
export { short, explorerAddr, explorerTx, nativeSymbol, rpc, formatEther };
export type { Address, Hex };
