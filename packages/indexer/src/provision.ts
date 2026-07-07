import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { saveExecKeyCipher, loadExecKeyCipher } from "./db.js";

// Fast in-process cache of execution keys. Backed by an ENCRYPTED DB table so
// keys survive an indexer restart (see db.ts exec_keys). A restart wipes this
// Map, but getExecKey() transparently decrypts from the DB on a cold miss.
const execKeys = new Map<string, `0x${string}`>();

// 32-byte AES key derived from a server secret. Set EXEC_KEY_SECRET in the
// environment; without it we fall back to REQUESTER_PRIVATE_KEY so a single-VPS
// deploy still works, but a dedicated secret is strongly recommended.
function encKey(): Buffer {
  const secret = process.env.EXEC_KEY_SECRET ?? process.env.REQUESTER_PRIVATE_KEY;
  if (!secret) throw new Error("set EXEC_KEY_SECRET (or REQUESTER_PRIVATE_KEY) to encrypt exec keys");
  return createHash("sha256").update(secret).digest();
}

function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

function decrypt(blob: string): string {
  const [ivHex, tagHex, dataHex] = blob.split(":");
  const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

// Test-only: exercise the decrypt path directly (restart-recovery regression).
export function __decryptForTest(blob: string): string {
  return decrypt(blob);
}

export function generateExecWallet(): { address: string; privateKey: `0x${string}` } {
  const privateKey = generatePrivateKey();
  const address = privateKeyToAccount(privateKey).address;
  return { address, privateKey };
}

// Returns the exec key from the in-process cache, or decrypts it from the DB
// (populating the cache) — so it works even after a restart.
export function getExecKey(address: string): `0x${string}` | undefined {
  const lc = address.toLowerCase();
  const cached = execKeys.get(lc);
  if (cached) return cached;
  const cipher = loadExecKeyCipher(lc);
  if (!cipher) return undefined;
  try {
    const key = decrypt(cipher) as `0x${string}`;
    execKeys.set(lc, key);
    return key;
  } catch {
    return undefined; // wrong secret / corrupt — treat as unavailable
  }
}

export function rememberExecKey(address: string, privateKey: `0x${string}`): void {
  const lc = address.toLowerCase();
  execKeys.set(lc, privateKey);
  saveExecKeyCipher(lc, encrypt(privateKey)); // persist encrypted so it survives restarts
}

// Called by the /agents POST handler. Generates a wallet, funds it from the
// faucet key, persists the encrypted key, and returns the public address.
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
