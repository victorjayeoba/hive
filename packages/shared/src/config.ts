import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineChain, type Chain } from "viem";

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

type ChainConfig = {
  rpcUrl: string;
  chainId: number;
  nativeSymbol: string;
  explorerBase: string;
  blockTimeMs: number;
};

// Env is validated lazily — on first access, not at import time — so simply
// importing this module (e.g. when Next.js collects route data at build time)
// never throws for a missing RPC_URL. The check fires only when the chain
// config is actually used at runtime.
let _chainConfig: ChainConfig | undefined;
function loadChainConfig(): ChainConfig {
  if (!_chainConfig) {
    _chainConfig = {
      rpcUrl: required("RPC_URL"),
      chainId: Number(required("CHAIN_ID")),
      nativeSymbol: process.env.NATIVE_SYMBOL ?? "ETH",
      explorerBase: process.env.EXPLORER_BASE ?? "",
      blockTimeMs: Number(process.env.BLOCK_TIME_MS ?? 750),
    };
  }
  return _chainConfig;
}

/**
 * Chain settings from env. Backed by a getter so accessing any field triggers
 * lazy validation — `chainConfig.rpcUrl` works exactly as before, but the
 * module can be imported without the env being present.
 */
export const chainConfig: ChainConfig = {
  get rpcUrl() {
    return loadChainConfig().rpcUrl;
  },
  get chainId() {
    return loadChainConfig().chainId;
  },
  get nativeSymbol() {
    // nativeSymbol has a default, so it never throws — safe to read anytime.
    return process.env.NATIVE_SYMBOL ?? "ETH";
  },
  get explorerBase() {
    return process.env.EXPLORER_BASE ?? "";
  },
  get blockTimeMs() {
    return Number(process.env.BLOCK_TIME_MS ?? 750);
  },
};

// A viem chain built from env so the same code targets Anvil locally and
// BOT Chain testnet in production — only .env changes. Built lazily on first use.
let _hiveChain: Chain | undefined;
export function getHiveChain(): Chain {
  if (!_hiveChain) {
    const cfg = loadChainConfig();
    _hiveChain = defineChain({
      id: cfg.chainId,
      name: "hive-target",
      nativeCurrency: { name: cfg.nativeSymbol, symbol: cfg.nativeSymbol, decimals: 18 },
      rpcUrls: { default: { http: [cfg.rpcUrl] } },
    });
  }
  return _hiveChain;
}

/**
 * The viem chain. Kept as a property getter so existing `hiveChain` imports
 * keep working, but the chain (and its env) is only resolved when read.
 */
export const hiveChain: Chain = new Proxy({} as Chain, {
  get(_target, prop, receiver) {
    return Reflect.get(getHiveChain(), prop, receiver);
  },
  has(_target, prop) {
    return Reflect.has(getHiveChain(), prop);
  },
  ownKeys() {
    return Reflect.ownKeys(getHiveChain());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getHiveChain(), prop);
  },
});

export const marketAddress = process.env.HIVE_MARKET_ADDRESS as `0x${string}` | undefined;

export function txUrl(hash: string): string {
  return `${chainConfig.explorerBase}/tx/${hash}`;
}

export function addressUrl(address: string): string {
  return `${chainConfig.explorerBase}/address/${address}`;
}
