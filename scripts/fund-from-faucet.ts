// Funds the agent wallets. On local Anvil they're pre-funded, so this just reports
// balances. On BOT Chain testnet it prints each address + the faucet URL to fund
// them from (faucet flows are usually manual/captcha, so we don't automate blindly).
import { createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainConfig, hiveChain } from "@hive/shared";

const keys = [
  ["requester", process.env.REQUESTER_PRIVATE_KEY],
  ["worker-1", process.env.WORKER_1_PRIVATE_KEY],
  ["worker-2", process.env.WORKER_2_PRIVATE_KEY],
  ["worker-3", process.env.WORKER_3_PRIVATE_KEY],
].filter(([, k]) => k) as [string, `0x${string}`][];

const client = createPublicClient({ chain: hiveChain, transport: http(chainConfig.rpcUrl) });
const faucet = process.env.FAUCET_URL;

for (const [label, key] of keys) {
  const address = privateKeyToAccount(key).address;
  const balance = await client.getBalance({ address });
  const funded = balance > 0n;
  console.log(`${label.padEnd(10)} ${address}  ${formatEther(balance)} ${chainConfig.nativeSymbol}  ${funded ? "✓" : "✗ needs funding"}`);
  if (!funded && faucet) console.log(`           fund at: ${faucet}`);
}
