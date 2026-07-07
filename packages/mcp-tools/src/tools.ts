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
  type AddressInfo,
  type TxItem,
  type TokenBalance,
  type TokenTransferItem,
  type Address,
  type Hex,
} from "./chain.js";
import { formatEther } from "viem";

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
  return {
    hash: t.hash,
    status: t.result,
    from: t.from.hash,
    to: t.to?.hash ?? null,
    toName: t.to?.name ?? null,
    value: fmtNative(t.value),
    method: t.method,
    decodedCall: t.decoded_input?.method_call ?? null,
    params:
      t.decoded_input?.parameters.map((p) => ({
        name: p.name,
        type: p.type,
        value: String(p.value),
      })) ?? [],
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

// --- helpers re-exported for consumers -------------------------------------
export { short, explorerAddr, explorerTx, nativeSymbol, rpc, formatEther };
export type { Address, Hex };
