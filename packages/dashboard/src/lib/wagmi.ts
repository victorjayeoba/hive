import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const botChain = defineChain({
  id: 968,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.bohr.life"] } },
  blockExplorers: { default: { name: "botscan", url: "https://scan.bohr.life" } },
});

export const wagmiConfig = createConfig({
  chains: [botChain],
  connectors: [injected()],
  transports: { [botChain.id]: http() },
});
