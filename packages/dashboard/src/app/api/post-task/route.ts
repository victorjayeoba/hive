import { NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainConfig, hiveChain, hiveMarketAbi, marketAddress } from "@hive/shared";
import { keccak256, toHex } from "viem";

// Publish the spec/input to the same off-chain store the swarm reads, so a
// judge-posted task is fully executable by a worker (only hashes go on-chain).
function publishToStore(specHash: string, inputHash: string, spec: object, input: string) {
  const root = resolve(process.cwd(), "../../.hive-store");
  const file = resolve(root, "store.json");
  const data = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : { specs: {}, inputs: {}, results: {} };
  data.specs[specHash] = spec;
  data.inputs[inputHash] = input;
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
}

// Lets a judge post a real task live from the dashboard. Uses the requester key
// server-side; posts a genuine task on-chain (the swarm picks it up from there).
export async function POST() {
  const key = process.env.REQUESTER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key || !marketAddress) {
    return NextResponse.json({ error: "requester key or market address not configured" }, { status: 500 });
  }

  const spec = {
    kind: "summarize",
    prompt: "Summarize the following text in one sentence of at most 20 words.",
    input:
      "Hive is the market for AI work on BOT Chain: you ask for on-chain analysis, worker agents " +
      "compete in a reverse auction to deliver the cheapest correct answer, and every result settles on-chain.",
  };

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: hiveChain, transport: http(chainConfig.rpcUrl) });
  const client = createPublicClient({ chain: hiveChain, transport: http(chainConfig.rpcUrl) });

  const specHash = keccak256(toHex(JSON.stringify({ kind: spec.kind, prompt: spec.prompt })));
  const inputHash = keccak256(toHex(spec.input));
  publishToStore(specHash, inputHash, { kind: spec.kind, prompt: spec.prompt, input: spec.input }, spec.input);

  const hash = await wallet.writeContract({
    address: marketAddress,
    abi: hiveMarketAbi,
    functionName: "postTask",
    args: [specHash, inputHash, 10n, 30n],
    value: 1000000000000000n,
  });
  await client.waitForTransactionReceipt({ hash });

  return NextResponse.json({ ok: true, txHash: hash });
}
