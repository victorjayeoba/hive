import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// In-memory store of execution keys, keyed by public address. Keys live ONLY in
// this runtime process — never persisted to the DB or sent to the browser.
const execKeys = new Map<string, `0x${string}`>();

export function generateExecWallet(): { address: string; privateKey: `0x${string}` } {
  const privateKey = generatePrivateKey();
  const address = privateKeyToAccount(privateKey).address;
  return { address, privateKey };
}

export function getExecKey(address: string): `0x${string}` | undefined {
  return execKeys.get(address.toLowerCase());
}

export function rememberExecKey(address: string, privateKey: `0x${string}`): void {
  execKeys.set(address.toLowerCase(), privateKey);
}

// Called by the /agents POST handler. Generates a wallet, funds it from the
// faucet key, remembers the key in-process, and returns the public address.
export async function provisionExecWallet(_agent: { name: string; ownerAddress: string }): Promise<string> {
  const { address, privateKey } = generateExecWallet();
  rememberExecKey(address, privateKey);
  await fundExecWallet(address);
  return address;
}

// Sends a small amount of BOT from the faucet/requester key to the new exec wallet
// so it can pay gas for bids/submits.
async function fundExecWallet(address: string): Promise<void> {
  const { createWalletClient, http, parseEther } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { hiveChain, chainConfig } = await import("@hive/shared");
  const faucetKey = (process.env.FAUCET_PRIVATE_KEY ?? process.env.REQUESTER_PRIVATE_KEY) as `0x${string}` | undefined;
  if (!faucetKey) throw new Error("no FAUCET_PRIVATE_KEY / REQUESTER_PRIVATE_KEY to fund exec wallets");
  const wallet = createWalletClient({ account: privateKeyToAccount(faucetKey), chain: hiveChain, transport: http(chainConfig.rpcUrl) });
  await wallet.sendTransaction({ to: address as `0x${string}`, value: parseEther(process.env.EXEC_FUND_AMOUNT ?? "0.02") });
}
