import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineChain } from "viem";

// Walk up from this file to find the repo-root .env, so every package loads the
// same config no matter which cwd it runs from.
function findEnv(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  return undefined;
}

loadEnv({ path: findEnv() });

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const chainConfig = {
  rpcUrl: required("RPC_URL"),
  chainId: Number(required("CHAIN_ID")),
  nativeSymbol: process.env.NATIVE_SYMBOL ?? "ETH",
  explorerBase: process.env.EXPLORER_BASE ?? "",
  blockTimeMs: Number(process.env.BLOCK_TIME_MS ?? 750),
} as const;

// A viem chain built from env so the same code targets Anvil locally and
// BOT Chain testnet in production — only .env changes.
export const hiveChain = defineChain({
  id: chainConfig.chainId,
  name: "hive-target",
  nativeCurrency: { name: chainConfig.nativeSymbol, symbol: chainConfig.nativeSymbol, decimals: 18 },
  rpcUrls: { default: { http: [chainConfig.rpcUrl] } },
});

export const marketAddress = process.env.HIVE_MARKET_ADDRESS as `0x${string}` | undefined;

export function txUrl(hash: string): string {
  return `${chainConfig.explorerBase}/tx/${hash}`;
}

export function addressUrl(address: string): string {
  return `${chainConfig.explorerBase}/address/${address}`;
}
