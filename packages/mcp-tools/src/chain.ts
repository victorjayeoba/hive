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

export const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
export const explorerAddr = (a: string) => `https://scan.bohr.life/address/${a}`;
export const explorerTx = (h: string) => `https://scan.bohr.life/tx/${h}`;

export type { Address, Hex };
