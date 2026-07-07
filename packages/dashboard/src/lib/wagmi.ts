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
// Get a free one at cloud.reown.com and set NEXT_PUBLIC_WC_PROJECT_ID in the
// environment (Vercel). The fallback below only keeps the build from crashing
// when the var is unset; mobile/WalletConnect will NOT work until the real ID
// is provided.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "MISSING_WC_PROJECT_ID";

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
