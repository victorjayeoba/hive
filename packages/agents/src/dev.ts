import { chainConfig } from "@hive/shared";

// Local-dev only: some Anvil builds mine solely on new transactions, so block-based
// windows never close when agents go quiet. Enable interval mining so the local
// chain advances on a timer like BOT Chain testnet does. No-op / harmless on chains
// that don't support the method (real testnet already produces blocks).
export async function enableIntervalMining(seconds = 1): Promise<void> {
  try {
    await fetch(chainConfig.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "evm_setIntervalMining", params: [seconds] }),
    });
  } catch {
    // Real testnet: method unsupported and unnecessary — blocks already flow.
  }
}
