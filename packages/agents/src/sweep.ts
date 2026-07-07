import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hiveChain, chainConfig } from "@hive/shared";

export function sweepAmount(balance: bigint, gasReserve: bigint): bigint {
  if (balance <= gasReserve) return 0n;
  return balance - gasReserve;
}

// Sweeps an exec wallet's balance (minus reserve) to the payout address on-chain.
// Returns the tx hash, or null if nothing to sweep.
export async function sweepEarnings(
  execKey: Hex,
  payoutAddress: `0x${string}`,
  balance: bigint,
  gasReserve = 5_000_000_000_000_000n,
): Promise<Hex | null> {
  const amount = sweepAmount(balance, gasReserve);
  if (amount === 0n) return null;
  const wallet = createWalletClient({
    account: privateKeyToAccount(execKey),
    chain: hiveChain,
    transport: http(chainConfig.rpcUrl),
  });
  return wallet.sendTransaction({ to: payoutAddress, value: amount });
}
