// BOT Chain data client — thin wrappers over the Blockscout REST API v2 (rich
// indexed data: history, transfers, scam flags, verification) plus raw RPC via
// viem for live state and simulation. This is the single source the tools read.

import { createPublicClient, http, formatEther, type Address, type Hex, type PublicClient } from "viem";

const EXPLORER_API =
  process.env.HIVE_EXPLORER_API ?? "https://scan.bohr.life/api/v2";
const RPC_URL = process.env.RPC_URL ?? "https://rpc.bohr.life";
const NATIVE = process.env.NATIVE_SYMBOL ?? "BOT";

export const rpc: PublicClient = createPublicClient({ transport: http(RPC_URL) });
export const nativeSymbol = NATIVE;

// The Hive on-chain contracts (defaults are the live testnet deployment).
export const marketAddress = (): Address =>
  (process.env.HIVE_MARKET_ADDRESS ?? "0x31fc3688295309a2a08627ddd1d65deeee85c201") as Address;
export const reputationAddress = (): Address =>
  (process.env.HIVE_REPUTATION_ADDRESS ?? "0x1B789752E8732a841DbE1ee9169189A8e01CF169") as Address;

/** GET a Blockscout API v2 path, returning parsed JSON (or throwing on non-2xx). */
export async function bs<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${EXPLORER_API}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Blockscout ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

/** Format a wei string to a human token amount with the native symbol. */
export function fmtNative(wei: string | bigint): string {
  try {
    return `${Number(formatEther(BigInt(wei))).toFixed(4)} ${NATIVE}`;
  } catch {
    return `${wei} wei`;
  }
}

// --- Blockscout response shapes we rely on (only the fields we use) ---

export interface AddressInfo {
  hash: string;
  coin_balance: string; // wei
  is_contract: boolean;
  is_scam: boolean;
  is_verified: boolean;
  has_tokens: boolean;
  has_token_transfers: boolean;
  implementations: { address: string; name: string | null }[];
  public_tags: string[];
  private_tags: string[];
  watchlist_names: string[];
  name: string | null;
  creation_tx_hash: string | null;
  exchange_rate: string | null;
}

export interface TxItem {
  hash: string;
  result: string; // "success" | error
  method: string | null;
  from: { hash: string; is_scam?: boolean; is_contract?: boolean };
  to: { hash: string; is_scam?: boolean; is_contract?: boolean; name?: string | null } | null;
  value: string; // wei
  timestamp: string | null;
  block_number: number | null;
  fee: { value: string } | null;
  raw_input: string;
  decoded_input: {
    method_call: string;
    parameters: { name: string; type: string; value: unknown }[];
  } | null;
}

export interface TokenBalance {
  token: { name: string | null; symbol: string | null; address: string; type: string; decimals: string | null };
  value: string;
}

export interface TokenTransferItem {
  from: { hash: string };
  to: { hash: string };
  token: { symbol: string | null; address: string };
  total: { value: string; decimals: string | null };
  tx_hash: string;
  timestamp: string | null;
}

export interface BalanceHistoryItem {
  block_number: number;
  block_timestamp: string;
  delta: string; // wei, signed
  value: string; // wei balance AFTER this change
  transaction_hash: string | null;
}

export interface TokenHolderItem {
  address: { hash: string; is_scam: boolean; is_contract: boolean; name: string | null };
  value: string; // raw token units
}

export interface TokenInfo {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: string | null;
  total_supply: string | null;
  holders: string | null;
}

export interface BlockItem {
  height: number;
  timestamp: string;
  tx_count: number;
  gas_used: string | null;
  miner?: { hash: string } | null;
}

export const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
export const explorerAddr = (a: string) => `https://scan.bohr.life/address/${a}`;
export const explorerTx = (h: string) => `https://scan.bohr.life/tx/${h}`;

export type { Address, Hex };
