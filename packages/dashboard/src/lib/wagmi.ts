import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { http } from "wagmi";

export const botChain = defineChain({
  id: 968,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.bohr.life"] } },
  blockExplorers: { default: { name: "botscan", url: "https://scan.bohr.life" } },
});

// WalletConnect Project ID — REQUIRED for mobile wallet connections (deeplinks).
// A Project ID is a PUBLIC client identifier (it ships in the browser bundle), so
// hardcoding a working one as the fallback is safe and guarantees mobile connect
// works even if the Vercel env var isn't picked up. Override via
// NEXT_PUBLIC_WC_PROJECT_ID if needed. Get one free at cloud.reown.com.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "9d24fa4a80068b7418e7831535b2e01e";

// getDefaultConfig returns a wagmi Config and automatically bundles injected +
// WalletConnect + Coinbase + a broad wallet list (so many desktop and mobile
// wallets work through RainbowKit's "Connect Wallet" modal). The export name is
// kept as `wagmiConfig` so providers.tsx keeps working unchanged.
export const wagmiConfig = getDefaultConfig({
  appName: "Hive",
  projectId,
  chains: [botChain],
  transports: { [botChain.id]: http() },
  ssr: true,
});
