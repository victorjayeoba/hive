// Local ABI decoder — names transactions the explorer CAN'T.
//
// BOT Chain's explorer only decodes VERIFIED contracts. HiveMarket is
// unverified, so Blockscout returns `decoded_input: null` and all a client
// sees is a raw 4-byte selector like `0xb8adaa11`. But we OWN this contract's
// ABI, so we can decode those calls ourselves — turning `0xb8adaa11` into
// `reject(taskId: 15)`. This is what makes /explain genuinely useful instead
// of just echoing hex back at the user.

import { decodeFunctionData, type AbiFunction } from "viem";

// The HiveMarket ABI (functions only — enough to name + decode any call to it).
// Kept inline so mcp-tools stays standalone (no cross-package build dependency).
const fn = (name: string, inputs: { name: string; type: string }[]): AbiFunction => ({
  type: "function",
  name,
  inputs: inputs as AbiFunction["inputs"],
  outputs: [],
  stateMutability: "nonpayable",
});

const HIVE_MARKET_ABI: readonly AbiFunction[] = [
  fn("postTask", [
    { name: "specHash", type: "bytes32" }, { name: "inputHash", type: "bytes32" },
    { name: "bidWindow", type: "uint64" }, { name: "workWindow", type: "uint64" },
  ]),
  fn("bid", [{ name: "taskId", type: "uint256" }, { name: "price", type: "uint256" }]),
  fn("accept", [{ name: "taskId", type: "uint256" }]),
  fn("award", [{ name: "taskId", type: "uint256" }]),
  fn("reject", [{ name: "taskId", type: "uint256" }]),
  fn("submit", [{ name: "taskId", type: "uint256" }, { name: "resultHash", type: "bytes32" }]),
  fn("timeoutSettle", [{ name: "taskId", type: "uint256" }]),
];

// Known HiveMarket contract addresses (lower-cased) whose calls we can self-decode.
const HIVE_ADDRESSES = new Set(
  [process.env.HIVE_MARKET_ADDRESS ?? "0x31fc3688295309a2a08627ddd1d65deeee85c201"].map((a) =>
    a.toLowerCase(),
  ),
);

export interface LocalDecode {
  method: string; // e.g. "reject"
  call: string; // e.g. "reject(taskId: 15)"
  params: { name: string; type: string; value: string }[];
}

/** True if `to` is a contract we hold the ABI for (so a null explorer decode is worth retrying locally). */
export function isKnownContract(to: string | null | undefined): boolean {
  return !!to && HIVE_ADDRESSES.has(to.toLowerCase());
}

/**
 * Decode raw calldata against the HiveMarket ABI. Returns null if the selector
 * isn't one of ours (or the data is malformed) — caller falls back to the raw hex.
 */
export function decodeHiveCall(rawInput: string | null | undefined): LocalDecode | null {
  if (!rawInput || rawInput === "0x" || rawInput.length < 10) return null;
  try {
    const { functionName, args } = decodeFunctionData({
      abi: HIVE_MARKET_ABI,
      data: rawInput as `0x${string}`,
    });
    const fn = HIVE_MARKET_ABI.find((f) => f.name === functionName);
    const inputs = fn?.inputs ?? [];
    const params = inputs.map((inp, i) => ({
      name: inp.name ?? `arg${i}`,
      type: inp.type,
      value: stringifyArg((args as readonly unknown[])[i]),
    }));
    const call = `${functionName}(${params.map((p) => `${p.name}: ${p.value}`).join(", ")})`;
    return { method: functionName, call, params };
  } catch {
    return null;
  }
}

function stringifyArg(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  return String(v);
}
