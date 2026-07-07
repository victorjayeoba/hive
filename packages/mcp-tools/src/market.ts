// Market tools — let an agent (or the Telegram bot) HIRE the Hive market, not just
// read the chain. Reads go through the indexer's public HTTP API; posting a task
// goes on-chain via viem. Kept standalone (minimal inline ABI) so the toolkit has
// no workspace deps.

import { createWalletClient, http, parseEther, defineChain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { explorerTx } from "./chain.js";

const INDEXER_HTTP = process.env.HIVE_INDEXER_HTTP ?? "https://cir-comes-wines-split.trycloudflare.com";
const RPC_URL = process.env.RPC_URL ?? "https://rpc.bohr.life";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 968);
const MARKET_ADDRESS = (process.env.HIVE_MARKET_ADDRESS ??
  "0x31fc3688295309a2a08627ddd1d65deeee85c201") as `0x${string}`;

// Only the postTask signature is needed here; full ABI lives in @hive/shared.
const POST_TASK_ABI = [
  {
    type: "function",
    name: "postTask",
    stateMutability: "payable",
    inputs: [
      { name: "specHash", type: "bytes32" },
      { name: "inputHash", type: "bytes32" },
      { name: "bidWindow", type: "uint64" },
      { name: "workWindow", type: "uint64" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
] as const;

const botChain = defineChain({
  id: CHAIN_ID,
  name: "bot-chain",
  nativeCurrency: { name: "BOT", symbol: process.env.NATIVE_SYMBOL ?? "BOT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

// --- get_market_stats ------------------------------------------------------

export interface MarketStats {
  tasks: number;
  bids: number;
  txs: number;
  settledCount: number;
  settledValue: string;
  activeAgents: number;
  explorerBase: string;
}

/** Live market totals, read from the Hive indexer. */
export async function getMarketStats(): Promise<MarketStats> {
  const snap = await fetchSnapshot();
  const c = snap.counters ?? {};
  return {
    tasks: c.tasks ?? 0,
    bids: c.bids ?? 0,
    txs: c.txs ?? 0,
    settledCount: c.settledCount ?? 0,
    settledValue: c.settledValue ?? "0",
    activeAgents: (snap.agents ?? []).length,
    explorerBase: snap.explorerBase ?? "https://scan.bohr.life",
  };
}

// --- get_task_status -------------------------------------------------------

const STATUS_LABEL: Record<number, string> = {
  1: "Posted", 2: "Bidding", 3: "Awarded", 4: "Submitted", 5: "Settled", 6: "Refunded",
};

export interface TaskStatus {
  id: number;
  status: string;
  worker: string | null;
  clearedPrice: string | null;
  bids: number;
  postedTx: string | null;
  settledTx: string | null;
}

/** Status of a specific task in the market, read from the indexer. */
export async function getTaskStatus(id: number): Promise<TaskStatus | { error: string }> {
  const snap = await fetchSnapshot();
  const t = (snap.tasks ?? []).find((x: { id: number }) => x.id === id);
  if (!t) return { error: `Task ${id} not found in the current market snapshot.` };
  return {
    id: t.id,
    status: STATUS_LABEL[t.status] ?? String(t.status),
    worker: t.worker,
    clearedPrice: t.price,
    bids: (t.bids ?? []).length,
    postedTx: t.postedUrl,
    settledTx: t.settledUrl,
  };
}

// --- post_task -------------------------------------------------------------

export interface PostResult {
  posted: true;
  txHash: string;
  explorer: string;
  note: string;
}

/**
 * Post a task to the Hive market on-chain. The caller provides a hash of the
 * spec/input (the content itself is off-chain). Requires HIVE_REQUESTER_KEY to
 * sign + fund the bounty. This is how an external agent HIRES Hive's workers.
 */
export async function postTask(args: {
  specHash: Hex;
  inputHash: Hex;
  bountyBot?: string; // e.g. "0.001"
  bidWindow?: number;
  workWindow?: number;
}): Promise<PostResult | { error: string }> {
  // Reuse the requester key already in .env (the one that deployed the contract),
  // or a dedicated HIVE_REQUESTER_KEY if you'd rather use a separate wallet.
  const key = (process.env.HIVE_REQUESTER_KEY ??
    process.env.REQUESTER_PRIVATE_KEY) as `0x${string}` | undefined;
  if (!key) {
    return {
      error:
        "No requester key — set REQUESTER_PRIVATE_KEY (or HIVE_REQUESTER_KEY) to a funded BOT Chain key to post tasks.",
    };
  }
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: botChain, transport: http(RPC_URL) });

  const txHash = await wallet.writeContract({
    address: MARKET_ADDRESS,
    abi: POST_TASK_ABI,
    functionName: "postTask",
    args: [
      args.specHash,
      args.inputHash,
      BigInt(args.bidWindow ?? 4),
      BigInt(args.workWindow ?? 12),
    ],
    value: parseEther(args.bountyBot ?? "0.001"),
  });

  return {
    posted: true,
    txHash,
    explorer: explorerTx(txHash),
    note: "Task posted on-chain. Worker agents will bid and fulfill it; track with get_task_status.",
  };
}

// --- internal --------------------------------------------------------------

async function fetchSnapshot(): Promise<any> {
  const res = await fetch(`${INDEXER_HTTP}/snapshot`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`indexer ${res.status} — is the Hive backend reachable?`);
  return res.json();
}
